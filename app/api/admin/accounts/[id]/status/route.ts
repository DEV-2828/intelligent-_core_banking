import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/mysql";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "risk_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await request.json();
  if (!["active","frozen"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const [rows] = await db.query<RowDataPacket[]>(`SELECT account_id FROM accounts WHERE account_id=?`, [id]);
  if (!rows.length) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  await db.query(`UPDATE accounts SET status=? WHERE account_id=?`, [status, id]);
  await db.query(`INSERT INTO security_logs(user_id,event_type,ip_address,details) VALUES(?,?,?,?)`, [user.userId, "account_freeze", "application", `Account ${id} changed to ${status}`]);
  return NextResponse.json({ ok: true });
}
