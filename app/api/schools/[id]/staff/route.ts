import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

async function assertSchoolAdmin(supabase: any, userId: string, schoolId: string) {
  const { data } = await supabase
    .from("user_profile_settings")
    .select("school_id, school_role")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.school_id === schoolId && data?.school_role === "admin";
}

// GET — list staff + pending invites for a school
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { id: schoolId } = await params;
  const isAdmin = await assertSchoolAdmin(supabase, session.userId, schoolId);
  if (!isAdmin) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const [staffResult, inviteResult, schoolResult] = await Promise.all([
    supabase
      .from("user_profile_settings")
      .select("user_id, school_role, users:user_id(email, raw_user_meta_data)")
      .eq("school_id", schoolId),
    supabase
      .from("school_invites")
      .select("id, email, accepted_at, expires_at, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase
      .from("schools")
      .select("seat_limit, name")
      .eq("id", schoolId)
      .maybeSingle(),
  ]);

  const staff = (Array.isArray(staffResult.data) ? staffResult.data : []).map((s: any) => ({
    userId: s.user_id,
    role: s.school_role,
    email: s.users?.email ?? null,
    displayName: s.users?.raw_user_meta_data?.display_name ?? null,
  }));

  const invites = (Array.isArray(inviteResult.data) ? inviteResult.data : []).filter(
    (i: any) => !i.accepted_at && new Date(i.expires_at) > new Date()
  );

  return NextResponse.json({
    ok: true,
    staff,
    pendingInvites: invites,
    seatLimit: schoolResult.data?.seat_limit ?? 10,
    schoolName: schoolResult.data?.name ?? "",
  });
}

// POST — invite a staff member by email
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { id: schoolId } = await params;
  const isAdmin = await assertSchoolAdmin(supabase, session.userId, schoolId);
  if (!isAdmin) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // Check seat limit
  const { data: school } = await supabase.from("schools").select("seat_limit").eq("id", schoolId).maybeSingle();
  const { count: currentStaff } = await supabase
    .from("user_profile_settings")
    .select("user_id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if ((currentStaff ?? 0) >= (school?.seat_limit ?? 10)) {
    return NextResponse.json({ error: "Seat limit reached. Upgrade your plan to add more staff." }, { status: 403 });
  }

  const { data: invite, error } = await supabase
    .from("school_invites")
    .insert({ school_id: schoolId, email })
    .select("id, token, email, expires_at")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Could not create invite" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, invite }, { status: 201 });
}
