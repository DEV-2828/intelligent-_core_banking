import type { RiskMetrics } from "./types";
export const MODEL_VERSION = "academic-ttm-v1";
export const statementFields = ["revenue", "operating_expenses", "net_operating_income", "operating_cash_flow", "total_debt_service", "short_term_liabilities", "total_assets", "current_assets"] as const;
export type Statement = { fiscal_year: number; fiscal_quarter: number } & Record<typeof statementFields[number], number>;
export type FinancialProfile = { legal_name: string; tax_identifier: string; entity_type: "RETAIL" | "SME" | "CORPORATE"; credit_bureau_payload: {bureau_name: string; score: number; delinquencies_24m: number}; financial_statements: Statement[] };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a financial data object");
  return value as Record<string, unknown>;
}
function number(value: unknown) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") throw new Error("A financial value is missing");
  const n = Number(String(value));
  if (!Number.isFinite(n) || Math.abs(n)>1e12) throw new Error("Financial values must be finite and within supported limits");
  return n;
}
function text(value: unknown, label: string) {
  if(typeof value!=="string" || !value.trim() || value.length>150) throw new Error(label+" is required (maximum 150 characters)");
  return value.trim();
}
export function validateFinancialProfile(input: unknown): FinancialProfile {
  const p=record(input), bureau=record(p.credit_bureau_payload);
  if(!["RETAIL","SME","CORPORATE"].includes(String(p.entity_type))) throw new Error("Choose a valid entity type");
  const score=number(bureau.score), delinquencies=number(bureau.delinquencies_24m);
  if(!Number.isInteger(score)||score<300||score>900||!Number.isInteger(delinquencies)||delinquencies<0) throw new Error("Invalid bureau score or delinquency count");
  if(!Array.isArray(p.financial_statements)||p.financial_statements.length<4||p.financial_statements.length>40) throw new Error("Provide between 4 and 40 quarterly statements");
  const seen=new Set<number>();
  const statements=p.financial_statements.map(raw=>{
    const s=record(raw),year=number(s.fiscal_year),quarter=number(s.fiscal_quarter);
    if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(quarter)||quarter<1||quarter>4) throw new Error("Invalid fiscal quarter");
    const period=year*4+quarter;
    if(seen.has(period)) throw new Error("Duplicate fiscal quarter"); seen.add(period);
    const values=Object.fromEntries(statementFields.map(key=>[key,number(s[key])])) as Record<typeof statementFields[number],number>;
    for(const key of ["revenue","operating_expenses","total_debt_service","short_term_liabilities","total_assets","current_assets"] as const) if(values[key]<0) throw new Error(key+" cannot be negative");
    if(values.current_assets>values.total_assets) throw new Error("Current assets cannot exceed total assets");
    return {fiscal_year:year,fiscal_quarter:quarter,...values};
  }).sort((a,b)=>(b.fiscal_year*4+b.fiscal_quarter)-(a.fiscal_year*4+a.fiscal_quarter));
  for(let i=1;i<4;i++) if(statements[i-1].fiscal_year*4+statements[i-1].fiscal_quarter-statements[i].fiscal_year*4-statements[i].fiscal_quarter!==1) throw new Error("The latest four quarters must be consecutive");
  return {legal_name:text(p.legal_name,"Legal name"),tax_identifier:text(p.tax_identifier,"Tax identifier"),entity_type:p.entity_type as FinancialProfile["entity_type"],credit_bureau_payload:{bureau_name:text(bureau.bureau_name,"Bureau name"),score,delinquencies_24m:delinquencies},financial_statements:statements};
}
export function calculateRisk(input: unknown, profileId: string, borrowerId: string, underwritingStatus: string, asOf=new Date()): RiskMetrics {
 const p=validateFinancialProfile(input), latest=p.financial_statements[0], quarters=p.financial_statements.slice(0,4);
 const current=asOf.getUTCFullYear()*4+Math.floor(asOf.getUTCMonth()/3)+1, period=latest.fiscal_year*4+latest.fiscal_quarter;
 if(period>current||current-period>2) throw new Error("Financial statements are future-dated or stale; update the latest quarters");
 const sum=(key:typeof statementFields[number])=>quarters.reduce((s,q)=>s+q[key],0);
 const debt=sum("total_debt_service"),revenue=sum("revenue");
 if(revenue<=0) throw new Error("Positive trailing-year revenue is required for assessment");
 const dscr=debt===0?null:sum("net_operating_income")/debt;
 const currentRatio=latest.short_term_liabilities===0?null:latest.current_assets/latest.short_term_liabilities;
 const clamp=(x:number)=>Math.max(0,Math.min(1,x));
 const score=clamp(p.credit_bureau_payload.score/850)*30+clamp((dscr??2)/2)*40+clamp((currentRatio??2)/2)*20+clamp(1-p.credit_bureau_payload.delinquencies_24m*0.25)*10;
 const round=(x:number)=>Math.round(x*100)/100;
 return {profileId,borrowerId,legalName:p.legal_name,entityType:p.entity_type,underwritingStatus,bureauScore:p.credit_bureau_payload.score,delinquencies:p.credit_bureau_payload.delinquencies_24m,dscr:dscr===null?null:round(dscr),ocfMargin:round(sum("operating_cash_flow")/revenue*100),currentRatio:currentRatio===null?null:round(currentRatio),riskScore:round(score),riskTier:score>=80?"LOW":score>=65?"MODERATE":score>=50?"HIGH":"VERY_HIGH",modelVersion:MODEL_VERSION,assessedAt:asOf.toISOString()};
}
export function recommendedAnnualRate(tier: RiskMetrics["riskTier"]) { return {LOW:0.0925,MODERATE:0.115,HIGH:0.14,VERY_HIGH:0.18}[tier]; }
