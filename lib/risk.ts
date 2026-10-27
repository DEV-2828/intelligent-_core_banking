import { ObjectId } from "mongodb";
import { mongoDb } from "@/lib/mongodb";
import type { RiskMetrics } from "@/lib/types";

function n(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toString" in value) return Number(String(value));
  return Number(value ?? 0);
}

function tier(score: number): RiskMetrics["riskTier"] {
  if (score >= 80) return "LOW";
  if (score >= 65) return "MODERATE";
  if (score >= 50) return "HIGH";
  return "VERY_HIGH";
}

export async function getRiskMetrics(profileId: string): Promise<RiskMetrics | null> {
  if (!ObjectId.isValid(profileId)) return null;
  const mdb = await mongoDb();
  const profile = await mdb.collection("credit_profiles").findOne({ _id: new ObjectId(profileId) });
  if (!profile) return null;

  const statements = [...(profile.financial_statements ?? [])].sort(
    (a, b) => (b.fiscal_year - a.fiscal_year) || (b.fiscal_quarter - a.fiscal_quarter),
  );
  const latestFour = statements.slice(0, 4);
  const latest = statements[0];

  const ttmNoi = latestFour.reduce((s, x) => s + n(x.net_operating_income), 0);
  const ttmDebt = latestFour.reduce((s, x) => s + n(x.total_debt_service), 0);
  const totalOcf = latestFour.reduce((s, x) => s + n(x.operating_cash_flow), 0);
  const totalRevenue = latestFour.reduce((s, x) => s + n(x.revenue), 0);
  const dscr = ttmDebt ? ttmNoi / ttmDebt : 2.5;
  const ocfMargin = totalRevenue ? (totalOcf / totalRevenue) * 100 : 0;
  const currentRatio = latest && n(latest.short_term_liabilities)
    ? n(latest.total_assets) / n(latest.short_term_liabilities)
    : 3;
  const bureauScore = Number(profile.credit_bureau_payload?.score ?? 0);
  const delinquencies = Number(profile.credit_bureau_payload?.delinquencies_24m ?? 0);

  const score =
    Math.min(1, bureauScore / 850) * 30 +
    Math.min(1, dscr / 2) * 40 +
    Math.min(1, currentRatio / 2) * 20 +
    Math.max(0, 1 - delinquencies * 0.25) * 10;

  return {
    profileId,
    borrowerId: String(profile.borrower_id),
    legalName: String(profile.legal_name),
    entityType: String(profile.entity_type),
    underwritingStatus: String(profile.underwriting_status),
    bureauScore,
    delinquencies,
    dscr: Number(dscr.toFixed(2)),
    ocfMargin: Number(ocfMargin.toFixed(2)),
    currentRatio: Number(currentRatio.toFixed(2)),
    riskScore: Number(score.toFixed(2)),
    riskTier: tier(score),
  };
}

export async function getRiskProfileForBorrower(borrowerId: string) {
  const mdb = await mongoDb();
  return mdb.collection("credit_profiles").findOne({ borrower_id: borrowerId });
}

export function recommendedAnnualRate(riskTier: RiskMetrics["riskTier"]) {
  return { LOW: 0.0925, MODERATE: 0.115, HIGH: 0.14, VERY_HIGH: 0.18 }[riskTier];
}
