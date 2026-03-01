import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

export async function POST(request) {
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/", redirectBase));
  response.cookies.set("pa_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  // Best-effort sign-out for Supabase session state.
  const supabase = getSupabaseAnonClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  return response;
}
