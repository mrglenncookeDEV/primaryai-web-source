import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { callScheduleAI, extractJson } from "@/src/engine/schedule-ai";

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndIso = weekEnd.toISOString().split("T")[0];

  const { data: events } = await supabase
    .from("lesson_schedule")
    .select("title,subject,year_group,scheduled_date,start_time,end_time,event_type,event_category")
    .eq("user_id", session.userId)
    .gte("scheduled_date", weekStart)
    .lt("scheduled_date", weekEndIso)
    .order("scheduled_date")
    .order("start_time");

  if (!events || events.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: "No lessons or events are scheduled this week.",
      highlights: [],
      suggestions: ["Add some lessons to your schedule to get started."],
    });
  }

  const eventLines = events.map((e) =>
    `- ${e.scheduled_date} ${e.start_time?.slice(0,5)}–${e.end_time?.slice(0,5)}: ${e.title} (${e.subject})`
  ).join("\n");

  const prompt = `A UK primary school teacher has the following schedule this week:

${eventLines}

Write a brief, helpful summary of their week. Be warm and professional.

Respond with ONLY valid JSON:
{
  "summary": "One or two sentence overview of the week",
  "highlights": ["2-3 specific positive observations about the week"],
  "suggestions": ["1-2 constructive suggestions or things to watch out for"]
}`;

  try {
    const raw = await callScheduleAI(prompt, 20_000);
    const parsed = extractJson(raw) as { summary?: string; highlights?: string[]; suggestions?: string[] };
    return NextResponse.json({
      ok: true,
      summary: parsed.summary ?? "",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ai-summary error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
