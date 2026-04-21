import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("wellbeing_checkins")
    .select("check_date, mood, note")
    .eq("user_id", session.userId)
    .gte("check_date", since.toISOString().slice(0, 10))
    .order("check_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = data?.find((r) => r.check_date === todayISO()) ?? null;
  return NextResponse.json({ today, history: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUserSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mood = Number(body.mood);
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
    return NextResponse.json({ error: "mood must be 1–5" }, { status: 400 });
  }
  const note: string | null = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });
  const { data, error } = await supabase
    .from("wellbeing_checkins")
    .upsert(
      { user_id: session.userId, check_date: todayISO(), mood, note, updated_at: new Date().toISOString() },
      { onConflict: "user_id,check_date" }
    )
    .select("check_date, mood, note")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checkin: data });
}
