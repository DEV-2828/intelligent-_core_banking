import { errorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/mysql";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: loanId } = await params;
  try {
    const { repaymentId, sourceAccountId } = await request.json();
    const [valid] = await db.query<RowDataPacket[]>(`
      SELECT r.repayment_id FROM loan_repayments r JOIN loans l ON l.loan_id=r.loan_id
      JOIN accounts a ON a.account_id=? AND a.user_id=l.borrower_id
      WHERE r.repayment_id=? AND l.loan_id=? AND l.borrower_id=? AND a.status='active'`, [sourceAccountId, repaymentId, loanId, user.userId]);
    if (!valid.length) return NextResponse.json({ error: "Repayment or source account is invalid" }, { status: 403 });
    const bankAccount = process.env.BANK_REPAYMENT_ACCOUNT_ID;
    if (!bankAccount) return NextResponse.json({ error: "BANK_REPAYMENT_ACCOUNT_ID is not configured" }, { status: 500 });
    await db.query(`CALL sp_pay_loan_installment(?,?,?)`, [repaymentId, sourceAccountId, bankAccount]);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: errorMessage(error, "Repayment failed") }, { status: 400 });
  }
}
