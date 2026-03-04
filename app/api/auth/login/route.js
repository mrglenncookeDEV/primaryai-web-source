import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { getProfileSetup } from "@/lib/profile-setup";

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

  let profileCompleted = false;
  try {
    const profileSetup = await getProfileSetup(data.user.id);
    profileCompleted = Boolean(profileSetup?.profileCompleted);
  } catch {
    profileCompleted = false;
  }

  const resolvedNext = profileCompleted
    ? redirectUrl.pathname + redirectUrl.search
    : `/profile-setup?next=${encodeURIComponent(redirectUrl.pathname + redirectUrl.search)}`;

  const response = NextResponse.redirect(new URL(resolvedNext, redirectBase));
  response.cookies.set("pa_session", JSON.stringify(sessionPayload(data.user)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set("pa_profile_complete", profileCompleted ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
