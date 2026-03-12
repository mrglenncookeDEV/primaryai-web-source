import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { getProfileSetup } from "@/lib/profile-setup";

export async function POST(request) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/dashboard");
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const nextPath = next.startsWith("/") ? next : "/dashboard";

  if (!email || !password) {
    const errorUrl = new URL("/signup", redirectBase);
    errorUrl.searchParams.set("error", "Email and password are required");
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  if (password.length < 8) {
    const errorUrl = new URL("/signup", redirectBase);
    errorUrl.searchParams.set("error", "Password must be at least 8 characters");
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    const errorUrl = new URL("/signup", redirectBase);
    errorUrl.searchParams.set("error", "Supabase is not configured");
    return NextResponse.redirect(errorUrl, { status: 303 });
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

  const userAlreadyExists =
    Boolean(data?.user) &&
    !data?.session &&
    Array.isArray(data?.user?.identities) &&
    data.user.identities.length === 0;

  if (userAlreadyExists) {
    return NextResponse.redirect(
      new URL("/login?error=An+account+with+that+email+already+exists", redirectBase),
      { status: 303 },
    );
  }

  // If email confirmation is off, session may be returned now.
  if (data?.user && data?.session) {
    let profileCompleted = false;
    try {
      const profileSetup = await getProfileSetup(data.user.id);
      profileCompleted = Boolean(profileSetup?.profileCompleted);
    } catch {
      profileCompleted = false;
    }

    const response = NextResponse.redirect(
      new URL(
        profileCompleted ? "/dashboard" : "/profile-setup?next=%2Fdashboard",
        redirectBase,
      ),
      { status: 303 },
    );
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
    response.cookies.set("pa_profile_complete", profileCompleted ? "1" : "0", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // If no session returned, attempt immediate sign-in (for projects with email confirmation disabled).
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error && signIn.data?.user) {
    let profileCompleted = false;
    try {
      const profileSetup = await getProfileSetup(signIn.data.user.id);
      profileCompleted = Boolean(profileSetup?.profileCompleted);
    } catch {
      profileCompleted = false;
    }

    const finalPath = profileCompleted
      ? nextPath
      : `/profile-setup?next=${encodeURIComponent(nextPath)}`;
    const response = NextResponse.redirect(new URL(finalPath, redirectBase), { status: 303 });
    response.cookies.set(
      "pa_session",
      JSON.stringify({
        userId: signIn.data.user.id,
        email: signIn.data.user.email || "",
        role: signIn.data.user.role || "authenticated",
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      },
    );
    response.cookies.set("pa_profile_complete", profileCompleted ? "1" : "0", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  return NextResponse.redirect(new URL("/login?registered=1&verify=1", redirectBase), { status: 303 });
}
