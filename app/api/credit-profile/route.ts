import { NextResponse } from "next/server";
import { Decimal128 } from "mongodb";
import { getSessionUser } from "@/lib/auth";
import { mongoDb } from "@/lib/mongodb";
import { calculateRisk, statementFields, validateFinancialProfile } from "@/lib/risk-calculator";
import { errorMessage } from "@/lib/errors";
export async function GET() {
 const user=await getSessionUser(); if(!user||user.role!=="customer") return NextResponse.json({error:"Unauthorized"},{status:401});
 try { const p=await (await mongoDb()).collection("credit_profiles").findOne({borrower_id:user.userId});
 return NextResponse.json(p?{profile:{legal_name:p.legal_name,tax_identifier:p.tax_identifier,entity_type:p.entity_type,credit_bureau_payload:p.credit_bureau_payload,financial_statements:p.financial_statements.map((q:Record<string,unknown>)=>({fiscal_year:q.fiscal_year,fiscal_quarter:q.fiscal_quarter,...Object.fromEntries(statementFields.map(k=>[k,q[k]===undefined?null:Number(String(q[k]))]))}))},revision:p.revision??0}:{profile:null,revision:0});
 }catch {return NextResponse.json({error:"Credit profile service unavailable"},{status:503});}
}
export async function POST(request:Request) {
 const user=await getSessionUser(); if(!user||user.role!=="customer") return NextResponse.json({error:"Unauthorized"},{status:401});
 try { const body=await request.json(),profile=validateFinancialProfile(body.profile);
 calculateRisk(profile,"",user.userId,"PENDING");
 const revision=body.revision; if(!Number.isInteger(revision)||revision<0) throw new Error("Invalid profile revision");
 const collection=(await mongoDb()).collection("credit_profiles");
 const financial_statements=profile.financial_statements.map(s=>({...s,...Object.fromEntries(statementFields.map(k=>[k,Decimal128.fromString(s[k].toFixed(2))]))}));
 const patch={...profile,financial_statements,updated_at:new Date(),revision:revision+1};
 const existing=await collection.findOne({borrower_id:user.userId},{projection:{_id:1}});
 if(!existing) {if(revision!==0) throw new Error("Reload the profile before saving");await collection.insertOne({...patch,borrower_id:user.userId,underwriting_status:"PENDING"});}
 else {const result=await collection.updateOne({_id:existing._id,...(revision===0?{$or:[{revision:0},{revision:{$exists:false}}]}:{revision})},{$set:patch});if(result.matchedCount!==1)return NextResponse.json({error:"Profile changed. Reload before editing."},{status:409});}
 return NextResponse.json({ok:true,revision:revision+1});
 }catch(error){return NextResponse.json({error:errorMessage(error,"Unable to save financial data")},{status:400});}
}
