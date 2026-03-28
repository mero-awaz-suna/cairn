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

const PUBLIC_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthenticated(request: NextRequest) {
  return AUTH_COOKIE_CANDIDATES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return Boolean(value);
  });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = isAuthenticated(request);
  const isPublic = isPublicRoute(pathname);

  if (!authenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isPublic) {
    const next = request.nextUrl.searchParams.get("next");
    const redirectPath = next && next.startsWith("/") ? next : "/";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (authenticated) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};