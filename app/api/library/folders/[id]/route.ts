import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("library_folders")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not rename folder" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, folder: data });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  // Unassign lesson packs in this folder (set folder_id to null)
  await supabase
    .from("lesson_packs")
    .update({ folder_id: null })
    .eq("folder_id", id)
    .eq("user_id", session.userId);

  // Unassign documents in this folder
  await supabase
    .from("library_documents")
    .update({ folder_id: null })
    .eq("folder_id", id)
    .eq("user_id", session.userId);

  const { error } = await supabase
    .from("library_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Could not delete folder" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
