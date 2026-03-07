import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { buildOutlookAuthorizeUrl, isOutlookConfigured } from "@/lib/outlook-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentUserSession();
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
  const isHttps = new URL(baseUrl).protocol === "https:";
  const wantsReauth = requestUrl.searchParams.get("reauth") === "1";

  if (!session?.userId) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/dashboard")}`, baseUrl));
  }

  if (!isOutlookConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?outlook=not-configured", baseUrl));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const response = NextResponse.redirect(
    buildOutlookAuthorizeUrl({
      baseUrl,
      state,
      prompt: wantsReauth ? "consent" : "select_account",
    }),
  );

  response.cookies.set("outlook_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 10,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
