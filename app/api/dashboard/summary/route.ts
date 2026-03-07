import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getProfileSetup } from "@/lib/profile-setup";
import { getActiveTermSummary } from "@/lib/user-terms";

function getMondayISO(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().split("T")[0];
}

function addDaysISO(iso: string, days: number) {
  const start = new Date(iso);
  start.setDate(start.getDate() + days);
  return start.toISOString().split("T")[0];
}

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Dashboard store unavailable" }, { status: 503 });
  }

  const weekStart = getMondayISO();
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const weekEnd = end.toISOString().split("T")[0];
  const todayIso = new Date().toISOString().split("T")[0];
  const upcomingEnd = addDaysISO(todayIso, 30);

  const [libraryResult, scheduleResult, upcomingResult, profileResult, tasksResult, activeTermResult] = await Promise.allSettled([
    supabase
      .from("lesson_packs")
      .select("id,title,year_group,subject,topic,created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("lesson_schedule")
      .select("id,lesson_pack_id,title,subject,year_group,scheduled_date,start_time,end_time,notes,event_type,event_category")
      .eq("user_id", session.userId)
      .gte("scheduled_date", weekStart)
      .lt("scheduled_date", weekEnd)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("lesson_schedule")
      .select("id,lesson_pack_id,title,subject,year_group,scheduled_date,start_time,end_time,notes,event_type,event_category")
      .eq("user_id", session.userId)
      .gte("scheduled_date", todayIso)
      .lte("scheduled_date", upcomingEnd)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("user_profile_setup")
      .select("display_name,avatar_url,profile_completed")
      .eq("user_id", session.userId)
      .maybeSingle(),
    (async () => {
      const primary = await supabase
        .from("personal_tasks")
        .select("id,title,due_date,due_time,importance,completed,schedule_event_id,created_at,updated_at")
        .eq("user_id", session.userId)
        .order("completed", { ascending: true })
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(50);
      const primaryErr = String(primary.error?.message || "").toLowerCase();
      if (primary.error && primaryErr.includes("due_time")) {
        return supabase
          .from("personal_tasks")
          .select("id,title,due_date,importance,completed,schedule_event_id,created_at,updated_at")
          .eq("user_id", session.userId)
          .order("completed", { ascending: true })
          .order("due_date", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(50);
      }
      return primary;
    })(),
    getActiveTermSummary(session.userId),
  ]);

  const libraryItems =
    libraryResult.status === "fulfilled" && !libraryResult.value.error ? (libraryResult.value.data ?? []) : [];
  const scheduleEvents =
    scheduleResult.status === "fulfilled" && !scheduleResult.value.error ? (scheduleResult.value.data ?? []) : [];
  const upNextEvents =
    upcomingResult.status === "fulfilled" && !upcomingResult.value.error ? (upcomingResult.value.data ?? []) : [];
  let profileSetup =
    profileResult.status === "fulfilled" && !profileResult.value.error && profileResult.value.data
      ? {
          displayName: String(profileResult.value.data.display_name || ""),
          avatarUrl: String(profileResult.value.data.avatar_url || ""),
          profileCompleted: Boolean(profileResult.value.data.profile_completed),
        }
      : { displayName: "", avatarUrl: "", profileCompleted: false };
  const tasks =
    tasksResult.status === "fulfilled" && !tasksResult.value.error ? (tasksResult.value.data ?? []) : [];
  const activeTerm =
    activeTermResult.status === "fulfilled" ? activeTermResult.value : null;

  // Backward-compatible fallback while user_profile_setup is being backfilled/migrated.
  if (!profileSetup.displayName && !profileSetup.avatarUrl) {
    try {
      const fallback = await getProfileSetup(session.userId);
      profileSetup = {
        displayName: String(fallback?.displayName || ""),
        avatarUrl: String(fallback?.avatarUrl || ""),
        profileCompleted: Boolean(fallback?.profileCompleted),
      };
    } catch {
      // Keep empty fallback.
    }
  }

  return NextResponse.json(
    {
      ok: true,
      userId: session.userId,
      email: session.email ?? "",
      libraryItems,
      scheduleEvents,
      upNextEvents,
      profileSetup,
      tasks,
      activeTerm,
    },
    { headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=60" } },
  );
}
