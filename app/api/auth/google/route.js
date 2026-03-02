import { NextResponse } from "next/server";
import crypto from "node:crypto";

// Force dynamic so Next.js never caches this route — every request must
// generate a fresh state token and issue a fresh Set-Cookie header.
export const dynamic = "force-dynamic";

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

  // SameSite=none ensures the cookie is sent when Google redirects back
  // (a cross-site top-level navigation) across all browsers.
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });

  // Prevent any CDN / proxy from caching this redirect.
  response.headers.set("Cache-Control", "no-store");

  return response;
}
