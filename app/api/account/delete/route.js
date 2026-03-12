import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function DELETE() {
  const session = await getAuthSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { error } = await admin.auth.admin.deleteUser(session.userId);
  if (error) {
    return NextResponse.json({ error: error.message ?? "Could not delete account" }, { status: 500 });
  }

  // Clear session cookies so the browser is signed out immediately
  const response = NextResponse.json({ ok: true });
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  response.cookies.set("pa_session", "", cookieOpts);
  response.cookies.set("pa_profile_complete", "", cookieOpts);

  return response;
}
