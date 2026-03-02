import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function setSessionCookie(response, user, isHttps) {
  response.cookies.set(
    "pa_session",
    JSON.stringify({
      userId: user.id,
      email: user.email || "",
      role: user.role || "authenticated",
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const requestUrl = new URL(request.url);
  const base = requestUrl.origin;
  const isHttps = requestUrl.protocol === "https:";

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in was cancelled")}`, base),
    );
  }

  const cookieState = request.cookies.get("oauth_state")?.value;
  if (!state || !cookieState || state !== cookieState) {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Your sign-in session expired — please try again")}`, base),
    );
    response.cookies.delete("oauth_state");
    return response;
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign-in failed — no authorisation code received")}`, base),
    );
  }

  const redirectUri = `${base}/api/auth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.id_token) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(tokenData.error_description || "Failed to exchange Google auth code")}`,
        base,
      ),
    );
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=Auth+not+configured", base));
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokenData.id_token,
  });

  if (error || !data?.user) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error?.message || "Google sign-in failed")}`,
        base,
      ),
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard", base));
  setSessionCookie(response, data.user, isHttps);
  response.cookies.delete("oauth_state");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
