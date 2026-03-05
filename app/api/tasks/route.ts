import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

type TaskImportance = "low" | "high";

function normaliseImportance(value: unknown): TaskImportance {
  return String(value || "").toLowerCase() === "high" ? "high" : "low";
}

function isMissingTasksTable(message: string) {
  const text = String(message || "").toLowerCase();
  return text.includes("personal_tasks") && (text.includes("schema cache") || text.includes("relation"));
}

function isScheduleSchemaOutdated(message: string) {
  const text = String(message || "").toLowerCase();
  return text.includes("lesson_pack_id");
}

function isMissingDueTimeColumn(message: string) {
  const text = String(message || "").toLowerCase();
  return text.includes("due_time");
}

function normaliseDueTime(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  return null;
}

function toMinutes(time: string): number {
  const [h, m] = String(time || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function toTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

async function getNextTaskSlot(supabase: any, userId: string, dueDate: string) {
  const { data } = await supabase
    .from("lesson_schedule")
    .select("start_time,end_time")
    .eq("user_id", userId)
    .eq("event_type", "custom")
    .in("event_category", ["task", "task_done"])
    .eq("scheduled_date", dueDate)
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  const start = Math.max(toMinutes(String(data?.end_time || "16:00")), 16 * 60);
  return {
    startTime: toTime(start),
    endTime: toTime(start + 30),
  };
}

function mapTask(task: Record<string, unknown>) {
  return {
    id: String(task.id || ""),
    title: String(task.title || ""),
    due_date: String(task.due_date || ""),
    due_time: task.due_time ? String(task.due_time).slice(0, 5) : null,
    importance: normaliseImportance(task.importance),
    completed: Boolean(task.completed),
    schedule_event_id: task.schedule_event_id ? String(task.schedule_event_id) : null,
    created_at: String(task.created_at || ""),
    updated_at: String(task.updated_at || ""),
  };
}

function inferImportanceFromEventTitle(title: string): TaskImportance {
  return /high\s+priority/i.test(title) ? "high" : "low";
}

function normaliseTaskTitleFromEvent(title: string): string {
  return String(title || "")
    .replace(/^(done|high\s+priority|task)\s*:\s*/i, "")
    .trim();
}

async function insertTaskFromScheduleEvent(
  supabase: any,
  userId: string,
  event: { id: string; title: string; scheduled_date: string; start_time?: string | null; event_category?: string | null },
) {
  const eventCategory = String(event.event_category || "").toLowerCase();
  const basePayload = {
    user_id: userId,
    title: normaliseTaskTitleFromEvent(event.title) || "Personal task",
    due_date: event.scheduled_date,
    importance: inferImportanceFromEventTitle(event.title),
    completed: eventCategory === "task_done",
    schedule_event_id: event.id,
  };

  const withDueTime = await supabase
    .from("personal_tasks")
    .insert({
      ...basePayload,
      due_time: normaliseDueTime(event.start_time),
    })
    .select("id")
    .maybeSingle();

  if (!withDueTime.error) return;
  if (!isMissingDueTimeColumn(withDueTime.error.message || "")) return;

  await supabase
    .from("personal_tasks")
    .insert(basePayload)
    .select("id")
    .maybeSingle();
}

export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Task store unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const includeCompleted = searchParams.get("includeCompleted") === "true";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("personal_tasks")
    .select("*")
    .eq("user_id", session.userId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (!includeCompleted) {
    query = query.eq("completed", false);
  }

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    query = query.gte("due_date", from);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    query = query.lte("due_date", to);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTasksTable(error.message || "")) {
      return NextResponse.json(
        { error: "Tasks table is missing. Run migration 019_personal_tasks.sql." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Task store unavailable" }, { status: 503 });
  }

  let tasks = Array.isArray(data) ? data : [];

  // Reconcile historical scheduler task events into personal_tasks so both views stay in sync.
  const existingEventIds = new Set(
    tasks.map((item: any) => String(item?.schedule_event_id || "")).filter(Boolean),
  );
  let scheduleQuery = supabase
    .from("lesson_schedule")
    .select("id,title,scheduled_date,start_time,event_category")
    .eq("user_id", session.userId)
    .eq("event_type", "custom")
    .in("event_category", ["task", "task_done"])
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    scheduleQuery = scheduleQuery.gte("scheduled_date", from);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    scheduleQuery = scheduleQuery.lte("scheduled_date", to);
  }

  const { data: scheduleTaskEvents } = await scheduleQuery;
  const missingEvents = (Array.isArray(scheduleTaskEvents) ? scheduleTaskEvents : []).filter(
    (event: any) => !existingEventIds.has(String(event?.id || "")),
  );

  if (missingEvents.length > 0) {
    for (const event of missingEvents) {
      await insertTaskFromScheduleEvent(supabase, session.userId, {
        id: String(event.id || ""),
        title: String(event.title || ""),
        scheduled_date: String(event.scheduled_date || ""),
        start_time: event.start_time ? String(event.start_time) : null,
        event_category: event.event_category ? String(event.event_category) : null,
      });
    }

    let refreshedQuery = supabase
      .from("personal_tasks")
      .select("*")
      .eq("user_id", session.userId)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });
    if (!includeCompleted) refreshedQuery = refreshedQuery.eq("completed", false);
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) refreshedQuery = refreshedQuery.gte("due_date", from);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) refreshedQuery = refreshedQuery.lte("due_date", to);
    const refreshed = await refreshedQuery;
    if (!refreshed.error && Array.isArray(refreshed.data)) {
      tasks = refreshed.data;
    }
  }

  return NextResponse.json({ ok: true, tasks: tasks.map((item) => mapTask(item)) });
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Task store unavailable" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const dueDate = String(body?.dueDate || "").trim();
  const dueTime = normaliseDueTime(body?.dueTime);
  const importance = normaliseImportance(body?.importance);

  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "Valid dueDate is required (YYYY-MM-DD)" }, { status: 400 });
  }

  let taskRow: Record<string, unknown> | null = null;
  let taskError: { message?: string } | null = null;
  {
    const primaryInsert = await supabase
      .from("personal_tasks")
      .insert({
        user_id: session.userId,
        title,
        due_date: dueDate,
        due_time: dueTime,
        importance,
        completed: false,
      })
      .select("*")
      .single();
    taskRow = primaryInsert.data;
    taskError = primaryInsert.error;
  }

  // Backward-compatible fallback for environments that have not yet applied migration 020.
  if ((taskError || !taskRow) && isMissingDueTimeColumn(taskError?.message || "")) {
    const fallbackInsert = await supabase
      .from("personal_tasks")
      .insert({
        user_id: session.userId,
        title,
        due_date: dueDate,
        importance,
        completed: false,
      })
      .select("*")
      .single();
    taskRow = fallbackInsert.data;
    taskError = fallbackInsert.error;
  }

  if (taskError || !taskRow) {
    const message = String(taskError?.message || "");
    if (isMissingTasksTable(message)) {
      return NextResponse.json(
        { error: "Tasks table is missing. Run migration 019_personal_tasks.sql." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: message || "Could not create task" }, { status: 503 });
  }

  const slot = dueTime
    ? { startTime: dueTime, endTime: toTime(toMinutes(dueTime) + 30) }
    : await getNextTaskSlot(supabase, session.userId, dueDate);
  const { data: eventRow, error: eventError } = await supabase
    .from("lesson_schedule")
    .insert({
      user_id: session.userId,
      lesson_pack_id: null,
      title: `${importance === "high" ? "High priority" : "Task"}: ${title}`,
      subject: "Task",
      year_group: "Personal",
      scheduled_date: dueDate,
      start_time: slot.startTime,
      end_time: slot.endTime,
      notes: `Personal task due ${dueDate}${dueTime ? ` ${dueTime.slice(0, 5)}` : ""}`,
      event_type: "custom",
      event_category: "task",
    })
    .select("*")
    .single();

  if (eventError || !eventRow) {
    await supabase.from("personal_tasks").delete().eq("id", taskRow.id).eq("user_id", session.userId);
    const message = String(eventError?.message || "");
    if (isScheduleSchemaOutdated(message)) {
      return NextResponse.json(
        { error: "Schedule schema is outdated. Run migration 016_schedule_custom_events.sql." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: message || "Could not add task to scheduler" }, { status: 503 });
  }

  const { data: updatedTask } = await supabase
    .from("personal_tasks")
    .update({
      schedule_event_id: eventRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskRow.id)
    .eq("user_id", session.userId)
    .select("*")
    .single();

  return NextResponse.json({
    ok: true,
    task: mapTask(updatedTask || taskRow),
    scheduleEvent: eventRow,
  });
}
