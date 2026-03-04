import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAnonClient } from "@/lib/supabase";

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const accessToken = String(body?.accessToken || "").trim();
  const newPassword = String(body?.password || "");

  if (!accessToken || !newPassword) {
    return NextResponse.json({ ok: false, error: "Invalid reset request" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters long" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAnonClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json(
      { ok: false, error: "Password reset is not configured" },
      { status: 503 },
    );
  }

  const userResult = await supabase.auth.getUser(accessToken);
  if (userResult.error || !userResult.data?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "This reset link is invalid or has expired" },
      { status: 401 },
    );
  }

  const { error } = await admin.auth.admin.updateUserById(userResult.data.user.id, {
    password: newPassword,
  });
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not update password. Please request a new reset link." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
