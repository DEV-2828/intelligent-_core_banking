import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { mongoDb } from "@/lib/mongodb";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !["loan_officer","risk_admin"].includes(user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: loanId } = await params;
  const { decision } = await request.json();
  if (!["approve","reject"].includes(decision)) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });

  const [rows] = await db.query<RowDataPacket[]>(`SELECT status,mongodb_credit_profile_id FROM loans WHERE loan_id=?`, [loanId]);
  const loan = rows[0];
  if (!loan || !["pending","under_review"].includes(loan.status)) return NextResponse.json({ error: "Loan is not in a reviewable state" }, { status: 400 });
  const profileId = String(loan.mongodb_credit_profile_id);

  try {
    if (decision === "approve") await db.query(`CALL sp_approve_loan(?,?)`, [loanId, user.userId]);
    else await db.query(`UPDATE loans SET status='rejected', officer_id=? WHERE loan_id=? AND status IN ('pending','under_review')`, [user.userId, loanId]);

    try {
      const mdb = await mongoDb();
      await mdb.collection("credit_profiles").updateOne({ _id: new ObjectId(profileId) }, { $set: { underwriting_status: decision === "approve" ? "APPROVED" : "REJECTED", approved_loan_id: decision === "approve" ? loanId : null, updated_at: new Date() } });
    } catch (mongoError) {
      if (decision === "approve") {
        await db.query(`DELETE FROM loan_repayments WHERE loan_id=? AND is_settled=FALSE`, [loanId]);
        await db.query(`UPDATE loans SET status=?, officer_id=NULL, approved_at=NULL WHERE loan_id=?`, [loan.status, loanId]);
      } else await db.query(`UPDATE loans SET status=?, officer_id=NULL WHERE loan_id=?`, [loan.status, loanId]);
      throw mongoError;
    }
    return NextResponse.json({ ok: true, decision });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.sqlMessage ?? error?.message ?? "Decision failed" }, { status: 500 });
  }
}
