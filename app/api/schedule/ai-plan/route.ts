import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile } from "@/lib/user-profile";
import { callScheduleAI, extractJson } from "@/src/engine/schedule-ai";

function weekDates(mondayIso: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayIso);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function dayName(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long" });
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const weekStart = typeof body?.weekStart === "string" ? body.weekStart : "";

  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return NextResponse.json({ error: "weekStart (YYYY-MM-DD) is required" }, { status: 400 });

  const profile = await getOrCreateUserProfile(session.userId);
  const dates = weekDates(weekStart);
  const dayMap = dates.map((d) => `${dayName(d)} = ${d}`).join(", ");

  const prompt = `A primary school teacher has described their upcoming week. Generate a schedule of lesson and event entries.

TEACHER PROFILE:
- Year group: ${profile.defaultYearGroup || "Year 4"}
- Default subject: ${profile.defaultSubject || "Maths"}
- School type: ${profile.schoolType || "primary"}

WEEK DATES: ${dayMap}

TEACHER'S DESCRIPTION:
"${description}"

RULES:
- Map each lesson/event to one of the week dates above using YYYY-MM-DD format
- Use realistic UK primary school times (typically 09:00–15:30, with lunch 12:00–13:00)
- Lessons are typically 45–60 minutes
- event_type must be "lesson_pack" for subject lessons or "custom" for other events
- For custom events provide event_category (e.g. "assembly", "meeting", "break")
- year_group should match the teacher's profile unless specified otherwise
- Generate between 5 and 15 events maximum

Respond with ONLY valid JSON in this exact format:
{
  "events": [
    {
      "title": "Maths - Fractions",
      "subject": "Maths",
      "year_group": "Year 4",
      "scheduled_date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "event_type": "lesson_pack",
      "event_category": null,
      "notes": null
    }
  ]
}`;

  try {
    const raw = await callScheduleAI(prompt);
    const parsed = extractJson(raw) as { events?: unknown[] };
    if (!Array.isArray(parsed?.events)) throw new Error("AI returned unexpected format");

    const events = parsed.events.filter((e: any) =>
      e?.title && e?.scheduled_date && e?.start_time && e?.end_time
    );

    return NextResponse.json({ ok: true, events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ai-plan error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
