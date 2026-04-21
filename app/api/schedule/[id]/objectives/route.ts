import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("lesson_objective_links")
    .select("id, objective_id, nc_objectives(id,code,description,subject,strand,year_group,key_stage)")
    .eq("schedule_event_id", id)
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: "Could not fetch objectives" }, { status: 503 });

  return NextResponse.json({
    ok: true,
    objectives: (Array.isArray(data) ? data : []).map((l: any) => ({
      linkId: l.id,
      ...l.nc_objectives,
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const objectiveId = String(body?.objectiveId || "").trim();

  if (!objectiveId) return NextResponse.json({ error: "objectiveId is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("lesson_objective_links")
    .insert({ user_id: session.userId, schedule_event_id: id, objective_id: objectiveId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, alreadyLinked: true });
    return NextResponse.json({ error: "Could not link objective" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, linkId: data.id }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const objectiveId = String(body?.objectiveId || "").trim();

  if (!objectiveId) return NextResponse.json({ error: "objectiveId is required" }, { status: 400 });

  await supabase
    .from("lesson_objective_links")
    .delete()
    .eq("schedule_event_id", id)
    .eq("objective_id", objectiveId)
    .eq("user_id", session.userId);

  return NextResponse.json({ ok: true });
}
