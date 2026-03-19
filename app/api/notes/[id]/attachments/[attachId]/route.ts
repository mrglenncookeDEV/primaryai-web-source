import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

const BUCKET = "note-attachments";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; attachId: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { attachId } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: attachment, error } = await supabase
    .from("note_attachments")
    .select("name,mime_type,storage_path")
    .eq("id", attachId)
    .eq("user_id", session.userId)
    .single();

  if (error || !attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(attachment.storage_path);

  if (downloadError || !fileData) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const buffer = await fileData.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; attachId: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, attachId } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { data: attachment } = await supabase
    .from("note_attachments")
    .select("storage_path")
    .eq("id", attachId)
    .eq("user_id", session.userId)
    .single();

  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  await supabase.from("note_attachments").delete().eq("id", attachId).eq("user_id", session.userId);
  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);

  // Touch note updated_at
  await supabase.from("teacher_notes").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ ok: true });
}
