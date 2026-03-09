import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tahla_session";

function getSecret(): string {
  const secret = process.env.TAHLA_COOKIE_SECRET;
  if (!secret) throw new Error("TAHLA_COOKIE_SECRET env variable is not set");
  return secret;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  if (pathname === "/lock" || pathname === "/register") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let valid = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(getSecret());
      const { payload } = await jwtVerify(token, secret);
      if (payload.userId) valid = true;
    } catch {
      // invalid or expired
    }
  }

  if (valid) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/lock", request.url));
}

export const config = {
  matcher: ["/((?!_next|api|lock|register).*)"],
};
