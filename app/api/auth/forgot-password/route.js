import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const next = String(form.get("next") || "/dashboard");

  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const doneUrl = new URL("/forgot-password", base);
  doneUrl.searchParams.set("sent", "1");
  if (next.startsWith("/")) {
    doneUrl.searchParams.set("next", next);
  }

  if (!email) {
    doneUrl.searchParams.set("error", "Enter your email address");
    return NextResponse.redirect(doneUrl);
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    doneUrl.searchParams.set("error", "Password reset is not available right now");
    return NextResponse.redirect(doneUrl);
  }

  const redirectTo = new URL("/reset-password", base).toString();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  return NextResponse.redirect(doneUrl);
}
