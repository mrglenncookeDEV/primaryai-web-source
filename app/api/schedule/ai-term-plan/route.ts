import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile } from "@/lib/user-profile";
import { callScheduleAI, extractJson } from "@/src/engine/schedule-ai";

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const documentText = typeof body?.documentText === "string" ? body.documentText.trim() : "";
  const termStart = typeof body?.termStart === "string" ? body.termStart : "";
  const termEnd = typeof body?.termEnd === "string" ? body.termEnd : "";

  if (!documentText) return NextResponse.json({ error: "Document text is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(termStart) || !/^\d{4}-\d{2}-\d{2}$/.test(termEnd)) {
    return NextResponse.json({ error: "termStart and termEnd (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const profile = await getOrCreateUserProfile(session.userId);

  // Trim document text to avoid token limits
  const trimmedDoc = documentText.slice(0, 8000);

  const prompt = `You are helping a UK primary school teacher plan their term schedule from the following curriculum document.

TEACHER PROFILE:
- Year group: ${profile.defaultYearGroup || "Year 4"}
- Default subject: ${profile.defaultSubject || "Maths"}
- School type: ${profile.schoolType || "primary"}

TERM DATES: ${termStart} to ${termEnd}

CURRICULUM DOCUMENT:
${trimmedDoc}

TASK: Generate a realistic weekly lesson schedule for this term based on the document.
- Generate 3–5 lessons per week spread across Mon–Fri
- Use weekday dates only (skip weekends)
- Start dates from ${termStart}, end by ${termEnd}
- Typical lesson time: 09:00–10:00 for Maths, 10:15–11:15 for English, 13:30–14:30 for other subjects
- event_type should always be "lesson_pack"
- Maximum 60 events total

Respond with ONLY valid JSON:
{
  "events": [
    {
      "title": "Fractions - Introduction",
      "subject": "Maths",
      "year_group": "Year 4",
      "scheduled_date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "event_type": "lesson_pack",
      "notes": null
    }
  ]
}`;

  try {
    const raw = await callScheduleAI(prompt, 45_000);
    const parsed = extractJson(raw) as { events?: unknown[] };
    if (!Array.isArray(parsed?.events)) throw new Error("AI returned unexpected format");

    const events = parsed.events
      .filter((e: any) => e?.title && e?.scheduled_date && e?.start_time && e?.end_time)
      .slice(0, 60);

    return NextResponse.json({ ok: true, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ai-term-plan error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
