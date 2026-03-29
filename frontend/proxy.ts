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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as Record<string, unknown>;
    return payload;
  } catch {
    return null;
  }
}

function isUnexpiredJwt(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return false;
  }

  const exp = payload.exp;
  if (typeof exp !== "number") {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp > nowInSeconds;
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthenticated(request: NextRequest) {
  return AUTH_COOKIE_CANDIDATES.some((name) => {
    const value = request.cookies.get(name)?.value;
    if (!value) {
      return false;
    }

    return isUnexpiredJwt(value);
  });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = isAuthenticated(request);
  const isPublic = isPublicRoute(pathname);

  if (!authenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    for (const cookieName of AUTH_COOKIE_CANDIDATES) {
      response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    }
    return response;
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