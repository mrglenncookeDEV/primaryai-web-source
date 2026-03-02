import { NextResponse } from "next/server";
import crypto from "node:crypto";

// Force dynamic so Next.js never caches this route — every request must
// generate a fresh state token and issue a fresh Set-Cookie header.
export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const base = requestUrl.origin;
  const isHttps = requestUrl.protocol === "https:";

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

  // SameSite=lax is sufficient for OAuth return on top-level navigation.
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 10,
  });

  // Prevent any CDN / proxy from caching this redirect.
  response.headers.set("Cache-Control", "no-store");

  return response;
}
