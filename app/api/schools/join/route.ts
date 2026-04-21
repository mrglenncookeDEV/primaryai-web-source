import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

// POST — accept a school invite using a token
export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "").trim();

  if (!token) return NextResponse.json({ error: "Invite token is required" }, { status: 400 });

  const { data: invite } = await supabase
    .from("school_invites")
    .select("id, school_id, email, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "Invite already used" }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite has expired" }, { status: 410 });

  // Check user not already in a different school
  const { data: profile } = await supabase
    .from("user_profile_settings")
    .select("school_id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (profile?.school_id && profile.school_id !== invite.school_id) {
    return NextResponse.json({ error: "You are already part of a different school" }, { status: 409 });
  }

  await Promise.all([
    supabase
      .from("user_profile_settings")
      .upsert({ user_id: session.userId, school_id: invite.school_id, school_role: "staff", updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
    supabase
      .from("school_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id),
  ]);

  const { data: school } = await supabase.from("schools").select("id,name").eq("id", invite.school_id).maybeSingle();

  return NextResponse.json({ ok: true, school });
}
