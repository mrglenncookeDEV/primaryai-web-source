import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { LessonPackSchema } from "@/src/engine/schema";

function parseLimit(value: string | null, fallback = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), 1), 300);
}

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") === "summary" ? "summary" : "full";
  const limit = parseLimit(searchParams.get("limit"), 100);

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  const selectCols = view === "summary"
    ? "id,title,year_group,subject,topic,created_at,updated_at"
    : "*";

  const { data, error } = await supabase
    .from("lesson_packs")
    .select(selectCols)
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { ok: true, items: data },
    { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" } },
  );
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = LessonPackSchema.safeParse(body?.pack ?? body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lesson pack payload" }, { status: 400 });
  }

  const pack = parsed.data;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : `${pack.subject} - ${pack.topic}`;

  const { data, error } = await supabase
    .from("lesson_packs")
    .insert({
      user_id: session.userId,
      title,
      year_group: pack.year_group,
      subject: pack.subject,
      topic: pack.topic,
      json: JSON.stringify(pack),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, item: data });
}
