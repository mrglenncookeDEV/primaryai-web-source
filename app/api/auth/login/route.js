import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase";
import { getProfileSetup } from "@/lib/profile-setup";

function sessionPayload(user) {
  return {
    userId: user.id,
    email: user.email || "",
    role: user.role || "authenticated",
  };
}

function expectsJson(request) {
  const accept = request.headers.get("accept") || "";
  const requestedWith = request.headers.get("x-requested-with") || "";
  return accept.includes("application/json") || requestedWith === "XMLHttpRequest";
}

async function signInWithPassword(email, password) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return { data: null, error: new Error("Supabase is not configured") };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: new Error(
          payload?.msg ||
          payload?.error_description ||
          payload?.error ||
          "Invalid credentials",
        ),
      };
    }

    return { data: payload, error: null };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { data: null, error: new Error("Sign-in timed out. Please try again.") };
    }
    return { data: null, error: new Error("Unable to sign in right now. Please try again.") };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request) {
  const wantsJson = expectsJson(request);
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/dashboard");

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUrl = new URL(next.startsWith("/") ? next : "/dashboard", redirectBase);

  if (!email || !password) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
    }
    const errorUrl = new URL("/login", redirectBase);
    errorUrl.searchParams.set("error", "Email and password are required");
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
    }
    const errorUrl = new URL("/login", redirectBase);
    errorUrl.searchParams.set("error", "Supabase is not configured");
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  const { data, error } = await signInWithPassword(email, password);

  if (error || !data?.user) {
    if (wantsJson) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Invalid credentials" },
        { status: 401 },
      );
    }
    const errorUrl = new URL("/login", redirectBase);
    errorUrl.searchParams.set("error", error?.message || "Invalid credentials");
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  let profileCompleted = false;
  try {
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ profileCompleted: false }), 2000)
    );
    const profileSetup = await Promise.race([getProfileSetup(data.user.id), timeout]);
    profileCompleted = Boolean(profileSetup?.profileCompleted);
  } catch {
    profileCompleted = false;
  }

  const resolvedNext = profileCompleted
    ? redirectUrl.pathname + redirectUrl.search
    : `/profile-setup?next=${encodeURIComponent(redirectUrl.pathname + redirectUrl.search)}`;

  const response = wantsJson
    ? NextResponse.json({ ok: true, redirectTo: resolvedNext })
    : NextResponse.redirect(new URL(resolvedNext, redirectBase), { status: 303 });
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
