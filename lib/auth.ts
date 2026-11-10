import {db} from "@/lib/mysql";
import type {RowDataPacket} from "mysql2";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { SessionUser, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "icb_session";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be configured and at least 32 characters long");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      userId: payload.sub,
      email: String(payload.email),
      firstName: String(payload.firstName ?? ""),
      lastName: String(payload.lastName ?? ""),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session=token?await verifySessionToken(token):null;
  if(!session)return null;
  const [rows]=await db.query<RowDataPacket[]>("SELECT role,is_active FROM users WHERE user_id=?",[session.userId]);
  return rows[0]?.is_active && rows[0].role===session.role ? session : null;
}

export async function requireUser(allowed?: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (allowed && !allowed.includes(user.role)) redirect(dashboardForRole(user.role));
  return user as SessionUser;
}

export function dashboardForRole(role: UserRole) {
  if (role === "loan_officer") return "/dashboard/officer";
  if (role === "risk_admin") return "/dashboard/admin";
  return "/dashboard/customer";
}
