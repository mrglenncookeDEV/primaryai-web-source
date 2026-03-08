import { getGoogleSyncStatus, syncScheduleEventToGoogle } from "@/lib/google-sync";
import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOutlookSyncStatus, syncScheduleEventToOutlook } from "@/lib/outlook-sync";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RepeatMode = "none" | "daily" | "weekly";

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildRecurringDates(startDate: string, repeat: RepeatMode, repeatUntil?: string | null) {
  const dates = [startDate];
  if (repeat === "none") return dates;
  if (!repeatUntil) {
    throw new Error("repeatUntil is required for recurring events");
  }

  const stepDays = repeat === "daily" ? 1 : 7;
  const end = parseIsoDate(repeatUntil);
  const cursor = parseIsoDate(startDate);
  const maxOccurrences = repeat === "daily" ? 180 : 104;

  while (dates.length < maxOccurrences) {
    cursor.setDate(cursor.getDate() + stepDays);
    if (cursor > end) break;
    dates.push(toIsoDate(cursor));
  }

  if (cursor <= end) {
    throw new Error("Recurring events are limited to 180 daily or 104 weekly bookings per save");
  }

  return dates;
}

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
    { headers: { "Cache-Control": "no-store, private" } },
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
    repeat,
    repeatUntil,
  } = body ?? {};

  const resolvedEventType = eventType === "custom" ? "custom" : "lesson_pack";
  const resolvedTitle = String(title || "").trim();
  const resolvedSubject = String(subject || "").trim() || (resolvedEventType === "custom" ? "General" : "");
  const resolvedYearGroup = String(yearGroup || "").trim() || (resolvedEventType === "custom" ? "All Years" : "");
  const resolvedRepeat: RepeatMode = repeat === "daily" || repeat === "weekly" ? repeat : "none";
  const resolvedRepeatUntil = typeof repeatUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(repeatUntil) ? repeatUntil : null;

  if (!resolvedTitle || !resolvedSubject || !resolvedYearGroup || !scheduledDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(scheduledDate))) {
    return NextResponse.json({ error: "scheduledDate must be YYYY-MM-DD" }, { status: 400 });
  }

  if (resolvedEventType === "lesson_pack" && !lessonPackId) {
    return NextResponse.json({ error: "lessonPackId is required for lesson pack events" }, { status: 400 });
  }

  if (startTime >= endTime) {
    return NextResponse.json({ error: "startTime must be before endTime" }, { status: 400 });
  }

  if (resolvedRepeat !== "none") {
    if (resolvedEventType !== "custom") {
      return NextResponse.json({ error: "Recurring events are only supported for custom events" }, { status: 400 });
    }
    if (!resolvedRepeatUntil) {
      return NextResponse.json({ error: "repeatUntil is required for recurring events" }, { status: 400 });
    }
    if (resolvedRepeatUntil < scheduledDate) {
      return NextResponse.json({ error: "repeatUntil must be on or after scheduledDate" }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  let occurrenceDates: string[] = [];
  try {
    occurrenceDates = buildRecurringDates(String(scheduledDate), resolvedRepeat, resolvedRepeatUntil);
  } catch (repeatError) {
    return NextResponse.json({ error: String((repeatError as Error).message || "Could not create recurring events") }, { status: 400 });
  }

  const rows = occurrenceDates.map((date) => ({
    user_id: session.userId,
    lesson_pack_id: resolvedEventType === "lesson_pack" ? lessonPackId : null,
    title: resolvedTitle,
    subject: resolvedSubject,
    year_group: resolvedYearGroup,
    scheduled_date: date,
    start_time: startTime,
    end_time: endTime,
    notes: notes ?? null,
    event_type: resolvedEventType,
    event_category: resolvedEventType === "custom" ? String(eventCategory || "").trim() || null : null,
  }));

  const { data, error } = await supabase
    .from("lesson_schedule")
    .insert(rows)
    .select();

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  const syncWarnings: string[] = [];
  try {
    const outlookStatus = await getOutlookSyncStatus(session.userId);
    if (outlookStatus.connected) {
      for (const event of data) {
        await syncScheduleEventToOutlook(session.userId, event);
      }
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not sync this event to Outlook"));
  }

  try {
    const googleStatus = await getGoogleSyncStatus(session.userId);
    if (googleStatus.connected) {
      for (const event of data) {
        await syncScheduleEventToGoogle(session.userId, event);
      }
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not sync this event to Google Calendar"));
  }

  const insertedIds = data.map((event) => event.id);
  const { data: refreshed } = await supabase
    .from("lesson_schedule")
    .select("*")
    .eq("user_id", session.userId)
    .in("id", insertedIds)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  const createdEvents = refreshed && refreshed.length > 0 ? refreshed : data;

  return NextResponse.json({
    ok: true,
    event: createdEvents[0],
    events: createdEvents,
    syncWarning: syncWarnings.length > 0 ? syncWarnings.join(" ") : undefined,
  });
}
