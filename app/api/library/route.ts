import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { LessonPackSchema } from "@/src/engine/schema";

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("lesson_packs")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, items: data });
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
