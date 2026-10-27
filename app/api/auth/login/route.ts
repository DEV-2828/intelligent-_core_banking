import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/mysql";
import { createSessionToken, dashboardForRole, SESSION_COOKIE } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT user_id, email, password_hash, first_name, last_name, role, is_active
      FROM users WHERE email=? LIMIT 1`, [String(email).toLowerCase().trim()]);
    const row = rows[0];
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

    if (!row || !row.is_active || !(await bcrypt.compare(String(password), row.password_hash))) {
      if (row) await db.query(`INSERT INTO security_logs(user_id,event_type,ip_address,details) VALUES(?,?,?,?)`, [row.user_id, "login_failure", ip, "Invalid password or inactive account"]);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user: SessionUser = { userId: row.user_id, email: row.email, firstName: row.first_name, lastName: row.last_name, role: row.role };
    const token = await createSessionToken(user);
    await db.query(`INSERT INTO security_logs(user_id,event_type,ip_address,details) VALUES(?,?,?,?)`, [row.user_id, "login_success", ip, "Application login"]);

    const response = NextResponse.json({ ok: true, role: user.role, redirectTo: dashboardForRole(user.role) });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
}
