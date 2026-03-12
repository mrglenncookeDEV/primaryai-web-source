import { NextResponse } from "next/server";

function expectsJson(request) {
  const accept = request.headers.get("accept") || "";
  const requestedWith = request.headers.get("x-requested-with") || "";
  return accept.includes("application/json") || requestedWith === "XMLHttpRequest";
}

export async function POST(request) {
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const response = expectsJson(request)
    ? NextResponse.json({ ok: true, redirectTo: "/" })
    : NextResponse.redirect(new URL("/", redirectBase), { status: 303 });
  const secure = process.env.NODE_ENV === "production";
  const expire = { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 };

  response.cookies.set("pa_session", "", expire);
  response.cookies.set("pa_profile_complete", "", expire);
  response.cookies.set("pa_entitlements", "", expire);

  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.includes("-auth-token") ||
      cookie.name.includes("authjs.session-token") ||
      cookie.name.includes("next-auth.session-token")
    ) {
      response.cookies.set(cookie.name, "", expire);
    }
  }

  return response;
}
