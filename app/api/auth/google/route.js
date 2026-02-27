import { NextResponse } from "next/server";
import crypto from "node:crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET() {
  const base = APP_URL || "https://primaryai.org.uk";

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL("/login?error=Google+not+configured", base));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${base}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
