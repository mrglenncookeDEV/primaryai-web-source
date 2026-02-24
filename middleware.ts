import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requiresAuth, requiresPaidEntitlement } from "./lib/guard";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token") && cookie.value.length > 0);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("pa_session")?.value;
  const entitlementCookie = request.cookies.get("pa_entitlements")?.value;
  const hasSession = Boolean(sessionCookie) || hasSupabaseSessionCookie(request);

  if (requiresAuth(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (requiresPaidEntitlement(pathname) && entitlementCookie !== "paid") {
    return NextResponse.redirect(new URL("/billing", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/billing/:path*"],
};
