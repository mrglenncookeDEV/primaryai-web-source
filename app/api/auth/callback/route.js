import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

function setSessionCookie(response, user) {
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
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );
}

export async function GET(request) {
  const supabase = getSupabaseAnonClient();
  const requestUrl = new URL(request.url);
  const base = requestUrl.origin;

  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=Supabase%20not%20configured", base));
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  let user = null;
  let error = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    user = result.data?.user || null;
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    user = result.data?.user || null;
    error = result.error;
  }

  if (error || !user) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message || "Invalid auth callback")}`, base),
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard", base));
  setSessionCookie(response, user);
  return response;
}
