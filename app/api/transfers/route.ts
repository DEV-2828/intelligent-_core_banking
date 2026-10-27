import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/mysql";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "customer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { sourceAccountId, destinationAccountId, amount, description } = await request.json();
    const numericAmount = Number(amount);
    if (!sourceAccountId || !destinationAccountId || !Number.isFinite(numericAmount) || numericAmount <= 0) return NextResponse.json({ error: "Invalid transfer details" }, { status: 400 });

    const [source] = await db.query<RowDataPacket[]>(`SELECT account_id FROM accounts WHERE account_id=? AND user_id=? AND status='active'`, [sourceAccountId, user.userId]);
    if (!source.length) return NextResponse.json({ error: "Source account is not available" }, { status: 403 });
    const [allowed] = await db.query<RowDataPacket[]>(`
      SELECT beneficiary_id FROM beneficiaries WHERE user_id=? AND beneficiary_account_id=? AND is_verified=TRUE`, [user.userId, destinationAccountId]);
    const [ownDestination] = await db.query<RowDataPacket[]>(`SELECT account_id FROM accounts WHERE account_id=? AND user_id=? AND status='active'`, [destinationAccountId, user.userId]);
    if (!allowed.length && !ownDestination.length) return NextResponse.json({ error: "Destination must be a verified beneficiary or your own account" }, { status: 403 });

    const conn = await db.getConnection();
    try {
      await conn.query(`SET @transfer_id = NULL`);
      await conn.query(`CALL sp_transfer_funds(?,?,?,?,@transfer_id)`, [sourceAccountId, destinationAccountId, numericAmount, String(description ?? "Bank transfer").slice(0,500)]);
      const [ids] = await conn.query<RowDataPacket[]>(`SELECT @transfer_id AS transaction_id`);
      return NextResponse.json({ ok: true, transactionId: ids[0]?.transaction_id });
    } finally { conn.release(); }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.sqlMessage ?? error?.message ?? "Transfer failed" }, { status: 400 });
  }
}
