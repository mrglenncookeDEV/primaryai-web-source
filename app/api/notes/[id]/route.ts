import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("teacher_notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json({ ok: true, note: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in body) updates.title = String(body.title ?? "").slice(0, 500);
  if ("content" in body) updates.content = String(body.content ?? "");
  if ("content_json" in body) updates.content_json = body.content_json ?? null;
  if ("pinned" in body) updates.pinned = Boolean(body.pinned);
  if ("lesson_pack_id" in body) updates.lesson_pack_id = body.lesson_pack_id ?? null;
  if ("schedule_event_id" in body) updates.schedule_event_id = body.schedule_event_id ?? null;
  if ("folder_id" in body) updates.folder_id = body.folder_id ?? null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("teacher_notes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not update note" }, { status: 503 });
  return NextResponse.json({ ok: true, note: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  // Fetch attachment storage paths first so we can clean them up
  const { data: attachments } = await supabase
    .from("note_attachments")
    .select("storage_path")
    .eq("note_id", id)
    .eq("user_id", session.userId);

  const { error } = await supabase
    .from("teacher_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: "Could not delete note" }, { status: 503 });

  // Best-effort storage cleanup
  if (attachments?.length) {
    const paths = attachments.map((a) => a.storage_path);
    await supabase.storage.from("note-attachments").remove(paths);
  }

  return NextResponse.json({ ok: true });
}
