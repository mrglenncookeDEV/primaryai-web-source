import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const hasRange = Boolean(from && to);

  if (hasRange) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
      return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
    }
  } else if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  let query = supabase
    .from("lesson_schedule")
    .select("*")
    .eq("user_id", session.userId)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (hasRange) {
    query = query.gte("scheduled_date", String(from)).lte("scheduled_date", String(to));
  } else {
    // Preserve existing week view behaviour: [weekStart, weekStart + 7d)
    const start = new Date(String(weekStart));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const weekEnd = end.toISOString().split("T")[0];
    query = query.gte("scheduled_date", String(weekStart)).lt("scheduled_date", weekEnd);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { ok: true, events: data },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } },
  );
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const {
    lessonPackId,
    title,
    subject,
    yearGroup,
    scheduledDate,
    startTime,
    endTime,
    notes,
    eventType,
    eventCategory,
  } = body ?? {};

  const resolvedEventType = eventType === "custom" ? "custom" : "lesson_pack";
  const resolvedTitle = String(title || "").trim();
  const resolvedSubject = String(subject || "").trim() || (resolvedEventType === "custom" ? "General" : "");
  const resolvedYearGroup = String(yearGroup || "").trim() || (resolvedEventType === "custom" ? "All Years" : "");

  if (!resolvedTitle || !resolvedSubject || !resolvedYearGroup || !scheduledDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (resolvedEventType === "lesson_pack" && !lessonPackId) {
    return NextResponse.json({ error: "lessonPackId is required for lesson pack events" }, { status: 400 });
  }

  if (startTime >= endTime) {
    return NextResponse.json({ error: "startTime must be before endTime" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("lesson_schedule")
    .insert({
      user_id: session.userId,
      lesson_pack_id: resolvedEventType === "lesson_pack" ? lessonPackId : null,
      title: resolvedTitle,
      subject: resolvedSubject,
      year_group: resolvedYearGroup,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      notes: notes ?? null,
      event_type: resolvedEventType,
      event_category: resolvedEventType === "custom" ? String(eventCategory || "").trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, event: data });
}
