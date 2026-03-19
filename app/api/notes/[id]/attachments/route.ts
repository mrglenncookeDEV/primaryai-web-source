import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

const BUCKET = "note-attachments";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdminClient>) {
  if (!supabase) return;
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  // Verify note ownership
  const { data: note } = await supabase
    .from("teacher_notes")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("note_attachments")
    .select("id,name,size_bytes,mime_type,created_at")
    .eq("note_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load attachments" }, { status: 503 });
  return NextResponse.json({ ok: true, attachments: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  // Verify note ownership
  const { data: note } = await supabase
    .from("teacher_notes")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });

  await ensureBucket(supabase);

  const storagePath = `${session.userId}/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(buffer), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: "Upload failed" }, { status: 503 });

  const { data, error: dbError } = await supabase
    .from("note_attachments")
    .insert({ note_id: id, user_id: session.userId, name: file.name, size_bytes: file.size, mime_type: file.type || null, storage_path: storagePath })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Could not save attachment" }, { status: 503 });
  }

  // Touch note updated_at
  await supabase.from("teacher_notes").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ ok: true, attachment: data }, { status: 201 });
}
