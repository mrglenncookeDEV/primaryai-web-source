import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

function sessionPayload(user) {
  return {
    userId: user.id,
    email: user.email || "",
    role: user.role || "authenticated",
  };
}

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/dashboard");

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUrl = new URL(next.startsWith("/") ? next : "/dashboard", redirectBase);

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const errorUrl = new URL("/login", redirectBase);
    errorUrl.searchParams.set("error", "Supabase is not configured");
    return NextResponse.redirect(errorUrl);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    const errorUrl = new URL("/login", redirectBase);
    errorUrl.searchParams.set("error", encodeURIComponent(error?.message || "Invalid credentials"));
    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("pa_session", JSON.stringify(sessionPayload(data.user)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
