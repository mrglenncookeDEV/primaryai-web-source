import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

const BUCKET = "library-docs";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdminClient>) {
  if (!supabase) return;
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folder_id");

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  let query = supabase
    .from("library_documents")
    .select("id,name,size_bytes,mime_type,folder_id,created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (folderId === "none") {
    query = query.is("folder_id", null);
  } else if (folderId) {
    query = query.eq("folder_id", folderId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, documents: data });
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 20 MB." }, { status: 413 });
  }

  const folderId = typeof formData.get("folder_id") === "string"
    ? (formData.get("folder_id") as string) || null
    : null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  await ensureBucket(supabase);

  const buffer = await file.arrayBuffer();
  const storagePath = `${session.userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(buffer), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 503 });
  }

  const { data, error: dbError } = await supabase
    .from("library_documents")
    .insert({
      user_id: session.userId,
      folder_id: folderId || null,
      name: file.name,
      size_bytes: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    // Try to clean up orphaned storage file
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Could not save document record." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, document: data });
}
