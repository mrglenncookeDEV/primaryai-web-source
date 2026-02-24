import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const redirectBase = new URL(request.url).origin;

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const errorUrl = new URL("/signup", redirectBase);
    errorUrl.searchParams.set("error", "Supabase is not configured");
    return NextResponse.redirect(errorUrl);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || redirectBase}/api/auth/callback`,
    },
  });

  if (error) {
    const errorUrl = new URL("/signup", redirectBase);
    errorUrl.searchParams.set("error", encodeURIComponent(error.message));
    return NextResponse.redirect(errorUrl);
  }

  // If email confirmation is off, session may be returned now.
  if (data?.user && data?.session) {
    const response = NextResponse.redirect(new URL("/dashboard", redirectBase));
    response.cookies.set(
      "pa_session",
      JSON.stringify({
        userId: data.user.id,
        email: data.user.email || "",
        role: data.user.role || "authenticated",
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      },
    );
    return response;
  }

  return NextResponse.redirect(new URL("/login?registered=1", redirectBase));
}
