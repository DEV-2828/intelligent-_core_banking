import { randomUUID } from "crypto";
import { errorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { mongoDb } from "@/lib/mongodb";
import { getRiskMetrics, getRiskProfileForBorrower, recommendedAnnualRate } from "@/lib/risk";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { amount, termMonths, purpose } = await request.json();
    const principal = Number(amount); const term = Number(termMonths);
    if (!Number.isFinite(principal) || principal < 10000 || ![12,18,24,36,48].includes(term) || !String(purpose ?? "").trim()) return NextResponse.json({ error: "Enter a valid amount, term and purpose" }, { status: 400 });

    const profile = await getRiskProfileForBorrower(user.userId);
    if (!profile) return NextResponse.json({ error: "No MongoDB credit profile is linked to this borrower" }, { status: 400 });
    const risk = await getRiskMetrics(String(profile._id));
    if (!risk) return NextResponse.json({ error: "Credit analytics could not be calculated" }, { status: 400 });

    const loanId = randomUUID(); const rate = recommendedAnnualRate(risk.riskTier);
    await db.query(`INSERT INTO loans(loan_id,borrower_id,officer_id,mongodb_credit_profile_id,principal_amount,annual_interest_rate,term_months,purpose,status) VALUES(?,?,?,?,?,?,?,?, 'under_review')`, [loanId, user.userId, null, String(profile._id), principal, rate, term, String(purpose).trim().slice(0,255)]);
    const mdb = await mongoDb();
    await mdb.collection("credit_profiles").updateOne({ _id: new ObjectId(String(profile._id)) }, { $set: { underwriting_status: "UNDER_REVIEW", updated_at: new Date() } });
    return NextResponse.json({ ok: true, loanId, riskTier: risk.riskTier, recommendedRate: rate });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: errorMessage(error, "Loan application failed") }, { status: 500 });
  }
}
