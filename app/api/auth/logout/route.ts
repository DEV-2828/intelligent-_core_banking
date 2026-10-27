import { NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/mysql";

export async function POST() {
  const user = await getSessionUser();
  if (user) await db.query(`INSERT INTO security_logs(user_id,event_type,ip_address,details) VALUES(?,?,?,?)`, [user.userId, "logout", "local", "Application logout"]);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
  return response;
}
