import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function escapeIcsText(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDateTime(dateStr: string, timeStr: string) {
  const cleanDate = String(dateStr || "").replace(/-/g, "");
  const cleanTime = String(timeStr || "00:00:00").slice(0, 8).replace(/:/g, "");
  return `${cleanDate}T${cleanTime}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return new NextResponse("Calendar feed unavailable", { status: 503 });
  }

  const { token } = await params;
  if (!token) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from("calendar_sync_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow?.user_id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const to = new Date(today);
  to.setDate(to.getDate() + 365);
  const fromIso = from.toISOString().split("T")[0];
  const toIso = to.toISOString().split("T")[0];

  const { data: events, error: eventsError } = await supabase
    .from("lesson_schedule")
    .select("id,title,subject,year_group,scheduled_date,start_time,end_time,notes,event_type,event_category")
    .eq("user_id", tokenRow.user_id)
    .gte("scheduled_date", fromIso)
    .lte("scheduled_date", toIso)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (eventsError) {
    return new NextResponse("Calendar feed unavailable", { status: 503 });
  }

  const nowStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PrimaryAI//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:PrimaryAI Schedule",
    "X-WR-TIMEZONE:Europe/London",
  ];

  for (const evt of events || []) {
    const summaryPrefix = evt.event_type === "custom" && evt.event_category ? `[${evt.event_category}] ` : "";
    const summary = escapeIcsText(`${summaryPrefix}${evt.title}`);
    const description = escapeIcsText(
      `${evt.subject} · ${evt.year_group}${evt.notes ? `\n${evt.notes}` : ""}`,
    );
    lines.push(
      "BEGIN:VEVENT",
      `UID:${evt.id}@primaryai`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatIcsDateTime(evt.scheduled_date, evt.start_time)}`,
      `DTEND:${formatIcsDateTime(evt.scheduled_date, evt.end_time)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
      "Content-Disposition": 'inline; filename="primaryai-schedule.ics"',
    },
  });
}
