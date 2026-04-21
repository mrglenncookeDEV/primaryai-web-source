import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

function toMins(t: string): number {
  const [h, m] = String(t || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Store unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const weeksBack = Math.min(12, Math.max(1, parseInt(searchParams.get("weeks") ?? "6", 10)));

  const now = new Date();
  const weekStart = getMondayOfWeek(now);
  const rangeEnd = toISO(addDays(weekStart, 6));    // end of this week
  const rangeStart = toISO(addDays(weekStart, -(weeksBack - 1) * 7)); // N weeks ago Monday

  // Fetch boundary settings
  const { data: settings } = await supabase
    .from("user_profile_settings")
    .select("work_day_start,work_day_end,protect_lunch,lunch_start,lunch_end,nights_off")
    .eq("user_id", session.userId)
    .maybeSingle();

  const workDayStart = String(settings?.work_day_start || "08:00");
  const workDayEnd   = String(settings?.work_day_end   || "17:00");
  const protectLunch = Boolean(settings?.protect_lunch ?? false);
  const lunchStart   = String(settings?.lunch_start || "12:00");
  const lunchEnd     = String(settings?.lunch_end   || "13:00");
  const nightsOff: string[] = Array.isArray(settings?.nights_off) ? settings.nights_off : [];

  const workDayMins  = toMins(workDayEnd) - toMins(workDayStart);
  const lunchMins    = protectLunch ? (toMins(lunchEnd) - toMins(lunchStart)) : 0;
  const effectiveDayMins = workDayMins - lunchMins;

  // Fetch schedule events in range
  const { data: events } = await supabase
    .from("lesson_schedule")
    .select("scheduled_date,start_time,end_time,event_type,event_category")
    .eq("user_id", session.userId)
    .gte("scheduled_date", rangeStart)
    .lte("scheduled_date", rangeEnd)
    .is("deleted_at", null)
    .not("event_category", "in", '("personal")');

  const rows = Array.isArray(events) ? events : [];

  // Fetch mood check-ins in range
  const { data: moodRows } = await supabase
    .from("wellbeing_checkins")
    .select("check_date, mood")
    .eq("user_id", session.userId)
    .gte("check_date", rangeStart)
    .lte("check_date", rangeEnd);

  const moodByDate = new Map<string, number>(
    (moodRows ?? []).map((r) => [String(r.check_date), Number(r.mood)])
  );

  // Build week buckets
  type WeekStats = {
    weekStart: string;
    scheduledMins: number;
    cappedMins: number;
    eveningsProtected: number;
    eveningsTotal: number;
    lunchesProtected: number;
    lunchesTotal: number;
    overloadDays: number;
    avgMood: number | null;
  };

  const weeks: WeekStats[] = [];
  for (let w = 0; w < weeksBack; w++) {
    const wMon = addDays(weekStart, -w * 7);
    const wDates: string[] = [];
    for (let d = 0; d < 5; d++) wDates.push(toISO(addDays(wMon, d)));

    let scheduledMins = 0;
    let eveningsProtected = 0;
    let lunchesProtected = 0;
    let overloadDays = 0;

    for (const dateStr of wDates) {
      const dayEvents = rows.filter((e) => e.scheduled_date === dateStr);

      // Scheduled minutes (capped at 24h/day to avoid bad data)
      const dayMins = dayEvents.reduce((sum, e) => {
        const dur = toMins(String(e.end_time || "00:00")) - toMins(String(e.start_time || "00:00"));
        return sum + Math.max(0, Math.min(dur, 1440));
      }, 0);
      scheduledMins += dayMins;

      // Evening protection: no events after work_day_end
      const hasLateEvent = dayEvents.some(
        (e) => toMins(String(e.end_time || "00:00")) > toMins(workDayEnd)
      );
      if (!hasLateEvent) eveningsProtected++;

      // Lunch protection
      if (protectLunch) {
        const lunchClash = dayEvents.some(
          (e) =>
            toMins(String(e.start_time || "00:00")) < toMins(lunchEnd) &&
            toMins(String(e.end_time || "00:00")) > toMins(lunchStart)
        );
        if (!lunchClash) lunchesProtected++;
      }

      // Overloaded day: >110% of effective working day
      if (dayMins > effectiveDayMins * 1.1) overloadDays++;
    }

    const weekMoods = wDates.map((d) => moodByDate.get(d)).filter((m): m is number => m !== undefined);
    const avgMood = weekMoods.length > 0 ? Math.round((weekMoods.reduce((s, m) => s + m, 0) / weekMoods.length) * 10) / 10 : null;

    weeks.push({
      weekStart: toISO(wMon),
      scheduledMins,
      cappedMins: Math.min(scheduledMins, effectiveDayMins * 5),
      eveningsProtected,
      eveningsTotal: 5,
      lunchesProtected: protectLunch ? lunchesProtected : 5,
      lunchesTotal: 5,
      overloadDays,
      avgMood,
    });
  }

  // Reverse so oldest week is first
  weeks.reverse();

  // Current week summary
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  // Running totals for "since start of term" (last 6 weeks)
  const recentWeeks = weeks.slice(-6);
  const totalEveningsProtected = recentWeeks.reduce((s, w) => s + w.eveningsProtected, 0);
  const totalEvenings = recentWeeks.reduce((s, w) => s + w.eveningsTotal, 0);
  const totalLunchesProtected = recentWeeks.reduce((s, w) => s + w.lunchesProtected, 0);
  const totalLunches = recentWeeks.reduce((s, w) => s + w.lunchesTotal, 0);

  // Trend: is this week's workload higher/lower/same vs last week?
  let trend: "improving" | "stable" | "worsening" = "stable";
  if (lastWeek) {
    const diff = thisWeek.scheduledMins - lastWeek.scheduledMins;
    if (diff < -30) trend = "improving";
    else if (diff > 30) trend = "worsening";
  }

  return NextResponse.json({
    ok: true,
    summary: {
      thisWeek: {
        scheduledMins: thisWeek?.scheduledMins ?? 0,
        cappedMins: thisWeek?.cappedMins ?? 0,
        workCapacityMins: effectiveDayMins * 5,
        eveningsProtected: thisWeek?.eveningsProtected ?? 0,
        lunchesProtected: thisWeek?.lunchesProtected ?? 0,
        overloadDays: thisWeek?.overloadDays ?? 0,
        trend,
      },
      allTime: {
        eveningsProtected: totalEveningsProtected,
        eveningsTotal: totalEvenings,
        lunchesProtected: totalLunchesProtected,
        lunchesTotal: totalLunches,
        weeksAnalysed: recentWeeks.length,
      },
      settings: {
        workDayStart,
        workDayEnd,
        protectLunch,
        lunchStart,
        lunchEnd,
        nightsOff,
        effectiveDayMins,
      },
      weeks,
    },
  });
}
