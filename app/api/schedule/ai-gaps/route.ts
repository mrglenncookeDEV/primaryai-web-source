import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile } from "@/lib/user-profile";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { callScheduleAI, extractJson } from "@/src/engine/schedule-ai";

const UK_SUBJECTS = [
  "Maths","English","Science","History","Geography",
  "Computing","Music","Art","PE","PSHE","RE","MFL",
];

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from and to (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const [profile, supabase] = await Promise.all([
    getOrCreateUserProfile(session.userId),
    Promise.resolve(getSupabaseAdminClient()),
  ]);

  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { data: events } = await supabase
    .from("lesson_schedule")
    .select("title,subject,scheduled_date,event_type")
    .eq("user_id", session.userId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .eq("event_type", "lesson_pack")
    .order("scheduled_date");

  if (!events || events.length === 0) {
    return NextResponse.json({
      ok: true,
      gaps: UK_SUBJECTS.map((s) => ({ subject: s, lastSeen: null, daysSince: null, severity: "info", suggestion: `No ${s} lessons scheduled in this period.` })),
      wellCovered: [],
    });
  }

  // Compute last seen per subject
  const lastSeen: Record<string, string> = {};
  for (const evt of events) {
    const subject = String(evt.subject || "");
    if (subject && (!lastSeen[subject] || evt.scheduled_date > lastSeen[subject])) {
      lastSeen[subject] = String(evt.scheduled_date);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const subjectSummary = UK_SUBJECTS.map((s) => {
    const last = lastSeen[s] ?? null;
    const daysSince = last
      ? Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86400000)
      : null;
    return `${s}: ${last ? `last on ${last} (${daysSince} days ago)` : "not scheduled"}`;
  }).join("\n");

  const prompt = `A UK primary school teacher's schedule from ${from} to ${to} shows:

${subjectSummary}

Identify which subjects have gaps or haven't been covered enough.
Be practical and constructive — not everything needs to be taught every week.
Maths and English typically appear daily, others weekly or fortnightly.

Respond with ONLY valid JSON:
{
  "gaps": [
    {
      "subject": "Science",
      "severity": "high",
      "suggestion": "Science hasn't appeared in 3 weeks — worth scheduling soon."
    }
  ],
  "wellCovered": ["Maths", "English"]
}

severity options: "high" (urgent), "medium" (worth noting), "low" (minor)
Only include subjects that actually have gaps. Keep wellCovered to genuinely well-covered subjects.`;

  try {
    const raw = await callScheduleAI(prompt, 20_000);
    const parsed = extractJson(raw) as { gaps?: unknown[]; wellCovered?: string[] };
    return NextResponse.json({
      ok: true,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      wellCovered: Array.isArray(parsed.wellCovered) ? parsed.wellCovered : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ai-gaps error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
