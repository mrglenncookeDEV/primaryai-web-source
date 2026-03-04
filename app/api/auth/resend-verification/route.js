import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const doneUrl = new URL("/resend-verification", redirectBase);
  doneUrl.searchParams.set("sent", "1");

  if (!email) {
    doneUrl.searchParams.set("error", "Enter your email address");
    return NextResponse.redirect(doneUrl);
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    doneUrl.searchParams.set("error", "Email verification is not available right now");
    return NextResponse.redirect(doneUrl);
  }

  await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || redirectBase}/api/auth/callback`,
    },
  });

  return NextResponse.redirect(doneUrl);
}
