import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_CANDIDATES = [
  "cairn_jwt",
  "cairn.jwt",
  "access_token",
  "accessToken",
  "token",
  "jwt",
];

function isAuthenticated(request: NextRequest) {
  return AUTH_COOKIE_CANDIDATES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return Boolean(value);
  });
}

export function proxy(request: NextRequest) {
  // Temporarily disabled to unblock internal page development.
  return NextResponse.next();

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/"],
};