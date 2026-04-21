import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

function mapSchool(s: Record<string, unknown>) {
  return {
    id: String(s.id || ""),
    name: String(s.name || ""),
    urn: s.urn ? String(s.urn) : null,
    postcode: s.postcode ? String(s.postcode) : null,
    plan: String(s.plan || "school_starter"),
    seat_limit: Number(s.seat_limit ?? 10),
    admin_user_id: s.admin_user_id ? String(s.admin_user_id) : null,
    created_at: String(s.created_at || ""),
  };
}

// GET — return the school this user belongs to (if any)
export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { data: profile } = await supabase
    .from("user_profile_settings")
    .select("school_id, school_role")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!profile?.school_id) {
    return NextResponse.json({ ok: true, school: null, role: null });
  }

  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .maybeSingle();

  return NextResponse.json({ ok: true, school: school ? mapSchool(school) : null, role: profile.school_role });
}

// POST — create a new school (caller becomes admin)
export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  // Prevent creating a second school if already in one
  const { data: existing } = await supabase
    .from("user_profile_settings")
    .select("school_id")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existing?.school_id) {
    return NextResponse.json({ error: "You are already part of a school" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const name     = String(body?.name || "").trim().slice(0, 200);
  const urn      = body?.urn ? String(body.urn).trim().slice(0, 20) : null;
  const postcode = body?.postcode ? String(body.postcode).trim().slice(0, 10).toUpperCase() : null;

  if (!name) return NextResponse.json({ error: "School name is required" }, { status: 400 });

  const { data: school, error } = await supabase
    .from("schools")
    .insert({ name, urn, postcode, admin_user_id: session.userId })
    .select("*")
    .single();

  if (error || !school) {
    return NextResponse.json({ error: "Could not create school" }, { status: 503 });
  }

  // Link admin user to school
  await supabase
    .from("user_profile_settings")
    .upsert({ user_id: session.userId, school_id: school.id, school_role: "admin", updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true, school: mapSchool(school) }, { status: 201 });
}
