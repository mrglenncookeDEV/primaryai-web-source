import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lessonPackId = searchParams.get("lesson_pack_id");
  const scheduleEventId = searchParams.get("schedule_event_id");
  const pinned = searchParams.get("pinned");

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  let query = supabase
    .from("teacher_notes")
    .select("*")
    .eq("user_id", session.userId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (lessonPackId) query = query.eq("lesson_pack_id", lessonPackId);
  if (scheduleEventId) query = query.eq("schedule_event_id", scheduleEventId);
  if (pinned === "true") query = query.eq("pinned", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load notes" }, { status: 503 });

  return NextResponse.json({ ok: true, notes: data });
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const title = String(body.title ?? "").slice(0, 500);
  const content = String(body.content ?? "");
  const noteType = body.note_type === "whiteboard" ? "whiteboard" : "text";
  const contentJson = body.content_json ?? null;
  const lessonPackId = typeof body.lesson_pack_id === "string" ? body.lesson_pack_id : null;
  const scheduleEventId = typeof body.schedule_event_id === "string" ? body.schedule_event_id : null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("teacher_notes")
    .insert({ user_id: session.userId, title, content, note_type: noteType, content_json: contentJson, lesson_pack_id: lessonPackId, schedule_event_id: scheduleEventId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not create note" }, { status: 503 });
  return NextResponse.json({ ok: true, note: data }, { status: 201 });
}
