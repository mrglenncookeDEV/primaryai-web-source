import { NextResponse } from "next/server";
import {
  deleteScheduleEventFromGoogle,
  getGoogleSyncStatus,
  syncScheduleEventToGoogle,
} from "@/lib/google-sync";
import {
  deleteScheduleEventFromOutlook,
  getOutlookSyncStatus,
  syncScheduleEventToOutlook,
} from "@/lib/outlook-sync";
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

async function getNextTaskSlot(
  supabase: any,
  userId: string,
  dueDate: string,
  ignoreEventId?: string | null,
) {
  let query = supabase
    .from("lesson_schedule")
    .select("id,start_time,end_time")
    .eq("user_id", userId)
    .eq("event_type", "custom")
    .in("event_category", ["task", "task_done"])
    .eq("scheduled_date", dueDate)
    .order("end_time", { ascending: false })
    .limit(5);

  if (ignoreEventId) {
    query = query.neq("id", ignoreEventId);
  }

  const { data } = await query;
  const latest = Array.isArray(data) ? data[0] : null;
  const start = Math.max(toMinutes(String(latest?.end_time || "16:00")), 16 * 60);
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Task store unavailable" }, { status: 503 });
  }

  const { id } = await params;
  const { data: existing, error: existingError } = await supabase
    .from("personal_tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existingError || !existing) {
    if (isMissingTasksTable(existingError?.message || "")) {
      return NextResponse.json(
        { error: "Tasks table is missing. Run migration 019_personal_tasks.sql." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body?.title !== undefined ? String(body.title || "").trim() : String(existing.title || "");
  const dueDate = body?.dueDate !== undefined ? String(body.dueDate || "").trim() : String(existing.due_date || "");
  const dueTime =
    body?.dueTime !== undefined
      ? normaliseDueTime(body.dueTime)
      : normaliseDueTime(existing.due_time);
  const importance = body?.importance !== undefined ? normaliseImportance(body.importance) : normaliseImportance(existing.importance);
  const completed = body?.completed !== undefined ? Boolean(body.completed) : Boolean(existing.completed);

  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "Valid dueDate is required (YYYY-MM-DD)" }, { status: 400 });
  }

  let updatedTask: Record<string, unknown> | null = null;
  let updateTaskError: { message?: string } | null = null;
  {
    const primaryUpdate = await supabase
      .from("personal_tasks")
      .update({
        title,
        due_date: dueDate,
        due_time: dueTime,
        importance,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("*")
      .single();
    updatedTask = primaryUpdate.data;
    updateTaskError = primaryUpdate.error;
  }

  // Backward-compatible fallback for environments that have not yet applied migration 020.
  if ((updateTaskError || !updatedTask) && isMissingDueTimeColumn(updateTaskError?.message || "")) {
    const fallbackUpdate = await supabase
      .from("personal_tasks")
      .update({
        title,
        due_date: dueDate,
        importance,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("*")
      .single();
    updatedTask = fallbackUpdate.data;
    updateTaskError = fallbackUpdate.error;
  }

  if (updateTaskError || !updatedTask) {
    return NextResponse.json({ error: "Could not update task" }, { status: 503 });
  }

  const existingEventId = existing.schedule_event_id ? String(existing.schedule_event_id) : null;
  const dueDateChanged = dueDate !== String(existing.due_date || "");
  const dueTimeChanged = (dueTime || "") !== String(existing.due_time || "");
  const slot = dueDateChanged
    ? await getNextTaskSlot(supabase, session.userId, dueDate, existingEventId)
    : null;

  const schedulerTitle = `${completed ? "Done" : importance === "high" ? "High priority" : "Task"}: ${title}`;
  const schedulerEventCategory = completed ? "task_done" : "task";

  let scheduleEvent = null;
  if (existingEventId) {
    const schedulePatch: Record<string, string | null> = {
      title: schedulerTitle,
      notes: `Personal task due ${dueDate}${dueTime ? ` ${dueTime.slice(0, 5)}` : ""}`,
      event_category: schedulerEventCategory,
      subject: "Task",
      year_group: "Personal",
      scheduled_date: dueDate,
    };
    if (dueTime) {
      schedulePatch.start_time = dueTime;
      schedulePatch.end_time = toTime(toMinutes(dueTime) + 30);
    } else if (slot || dueTimeChanged) {
      const fallbackSlot = slot || await getNextTaskSlot(supabase, session.userId, dueDate, existingEventId);
      schedulePatch.start_time = fallbackSlot.startTime;
      schedulePatch.end_time = fallbackSlot.endTime;
    }

    const { data: updatedSchedule } = await supabase
      .from("lesson_schedule")
      .update(schedulePatch)
      .eq("id", existingEventId)
      .eq("user_id", session.userId)
      .select("*")
      .maybeSingle();
    scheduleEvent = updatedSchedule || null;
  } else {
    const newSlot = dueTime
      ? { startTime: dueTime, endTime: toTime(toMinutes(dueTime) + 30) }
      : await getNextTaskSlot(supabase, session.userId, dueDate);
    const { data: createdSchedule } = await supabase
      .from("lesson_schedule")
      .insert({
        user_id: session.userId,
        lesson_pack_id: null,
        title: schedulerTitle,
        subject: "Task",
        year_group: "Personal",
        scheduled_date: dueDate,
        start_time: newSlot.startTime,
        end_time: newSlot.endTime,
        notes: `Personal task due ${dueDate}${dueTime ? ` ${dueTime.slice(0, 5)}` : ""}`,
        event_type: "custom",
        event_category: schedulerEventCategory,
      })
      .select("*")
      .maybeSingle();
    if (createdSchedule?.id) {
      scheduleEvent = createdSchedule;
      const { data: linkedTask } = await supabase
        .from("personal_tasks")
        .update({ schedule_event_id: createdSchedule.id, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", session.userId)
        .select("*")
        .maybeSingle();
      if (linkedTask) {
        return NextResponse.json({ ok: true, task: mapTask(linkedTask), scheduleEvent });
      }
    }
  }

  const syncWarnings: string[] = [];
  if (scheduleEvent?.id) {
    try {
      const outlookStatus = await getOutlookSyncStatus(session.userId);
      if (outlookStatus.connected) {
        await syncScheduleEventToOutlook(session.userId, scheduleEvent);
      }
    } catch (syncError) {
      syncWarnings.push(String((syncError as Error)?.message || "Could not sync this task to Outlook"));
    }

    try {
      const googleStatus = await getGoogleSyncStatus(session.userId);
      if (googleStatus.connected) {
        await syncScheduleEventToGoogle(session.userId, scheduleEvent);
      }
    } catch (syncError) {
      syncWarnings.push(String((syncError as Error)?.message || "Could not sync this task to Google Calendar"));
    }
  }

  return NextResponse.json({
    ok: true,
    task: mapTask(updatedTask),
    scheduleEvent,
    syncWarning: syncWarnings.length > 0 ? syncWarnings.join(" ") : undefined,
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Task store unavailable" }, { status: 503 });
  }

  const { id } = await params;
  const { data: existing } = await supabase
    .from("personal_tasks")
    .select("id,schedule_event_id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!existing?.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  let scheduleRow: { outlook_event_id?: string | null; google_event_id?: string | null } | null = null;
  if (existing.schedule_event_id) {
    const { data } = await supabase
      .from("lesson_schedule")
      .select("outlook_event_id,google_event_id")
      .eq("id", existing.schedule_event_id)
      .eq("user_id", session.userId)
      .maybeSingle();
    scheduleRow = data || null;

    await supabase
      .from("lesson_schedule")
      .delete()
      .eq("id", existing.schedule_event_id)
      .eq("user_id", session.userId);
  }

  const { error } = await supabase
    .from("personal_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Could not delete task" }, { status: 503 });
  }

  const syncWarnings: string[] = [];
  try {
    const outlookStatus = await getOutlookSyncStatus(session.userId);
    if (outlookStatus.connected && scheduleRow?.outlook_event_id) {
      await deleteScheduleEventFromOutlook(session.userId, scheduleRow.outlook_event_id);
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not delete this task from Outlook"));
  }

  try {
    const googleStatus = await getGoogleSyncStatus(session.userId);
    if (googleStatus.connected && scheduleRow?.google_event_id) {
      await deleteScheduleEventFromGoogle(session.userId, scheduleRow.google_event_id);
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not delete this task from Google Calendar"));
  }

  return NextResponse.json({ ok: true, syncWarning: syncWarnings.length > 0 ? syncWarnings.join(" ") : undefined });
}
