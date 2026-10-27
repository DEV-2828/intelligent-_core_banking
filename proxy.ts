import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "");
}

function home(role: string) {
  if (role === "loan_officer") return "/dashboard/officer";
  if (role === "risk_admin") return "/dashboard/admin";
  return "/dashboard/customer";
}

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get("icb_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = String(payload.role ?? "");
    const path = request.nextUrl.pathname;
    const allowed =
      (path.startsWith("/dashboard/customer") && role === "customer") ||
      (path.startsWith("/dashboard/officer") && role === "loan_officer") ||
      (path.startsWith("/dashboard/admin") && role === "risk_admin");
    return allowed ? NextResponse.next() : NextResponse.redirect(new URL(home(role), request.url));
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("icb_session");
    return response;
  }
}

export const config = { matcher: ["/dashboard/:path*"] };
