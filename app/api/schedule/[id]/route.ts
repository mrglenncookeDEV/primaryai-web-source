import { deleteScheduleEventFromGoogle, getGoogleSyncStatus, syncScheduleEventToGoogle } from "@/lib/google-sync";
import { NextResponse } from "next/server";
import { deleteScheduleEventFromOutlook, getOutlookSyncStatus, syncScheduleEventToOutlook } from "@/lib/outlook-sync";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isMissingDueTimeColumn(message: string) {
  return String(message || "").toLowerCase().includes("due_time");
}

function normaliseTaskTitle(value: string) {
  return String(value || "")
    .replace(/^(done|high\s+priority|task)\s*:\s*/i, "")
    .trim();
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  const { data: current } = await supabase
    .from("lesson_schedule")
    .select("external_source,outlook_event_id,google_event_id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (current?.external_source) {
    return NextResponse.json({ error: "Imported calendar events are read-only" }, { status: 403 });
  }

  const { error } = await supabase
    .from("lesson_schedule")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  const syncWarnings: string[] = [];
  try {
    const outlookStatus = await getOutlookSyncStatus(session.userId);
    if (outlookStatus.connected && current?.outlook_event_id) {
      await deleteScheduleEventFromOutlook(session.userId, current.outlook_event_id);
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not remove this event from Outlook"));
  }

  try {
    const googleStatus = await getGoogleSyncStatus(session.userId);
    if (googleStatus.connected && current?.google_event_id) {
      await deleteScheduleEventFromGoogle(session.userId, current.google_event_id);
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not remove this event from Google Calendar"));
  }

  return NextResponse.json({ ok: true, syncWarning: syncWarnings.length > 0 ? syncWarnings.join(" ") : undefined });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { scheduledDate, startTime, endTime, notes, title, subject, yearGroup, eventCategory } = body ?? {};

  if (startTime && endTime && startTime >= endTime) {
    return NextResponse.json({ error: "startTime must be before endTime" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (scheduledDate) updates.scheduled_date = scheduledDate;
  if (startTime) updates.start_time = startTime;
  if (endTime) updates.end_time = endTime;
  if (notes !== undefined) updates.notes = notes;
  if (title !== undefined) updates.title = String(title).trim();
  if (subject !== undefined) updates.subject = String(subject).trim();
  if (yearGroup !== undefined) updates.year_group = String(yearGroup).trim();
  if (eventCategory !== undefined) updates.event_category = eventCategory ? String(eventCategory).trim() : null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  const { data: beforeEvent } = await supabase
    .from("lesson_schedule")
    .select("id,title,subject,year_group,scheduled_date,start_time,end_time,notes,event_type,event_category,external_source,outlook_event_id,google_event_id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (beforeEvent?.external_source) {
    return NextResponse.json({ error: "Imported calendar events are read-only" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("lesson_schedule")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  const isTaskEvent =
    String(data?.event_type || "").toLowerCase() === "custom" &&
    String(data?.event_category || "").toLowerCase().startsWith("task");

  if (isTaskEvent) {
    const dueDate = String(data?.scheduled_date || "").trim();
    const dueTime = data?.start_time ? String(data.start_time).slice(0, 8) : null;
    if (dueDate) {
      const primaryUpdate = await supabase
        .from("personal_tasks")
        .update({
          due_date: dueDate,
          due_time: dueTime,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.userId)
        .eq("schedule_event_id", id);

      if (primaryUpdate.error && isMissingDueTimeColumn(primaryUpdate.error.message || "")) {
        await supabase
          .from("personal_tasks")
          .update({
            due_date: dueDate,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", session.userId)
          .eq("schedule_event_id", id);
      }

      // Fallback for historical rows where schedule_event_id was not linked.
      const beforeTitle = normaliseTaskTitle(String(beforeEvent?.title || ""));
      const afterTitle = normaliseTaskTitle(String(data?.title || ""));
      const fallbackTitle = afterTitle || beforeTitle;
      const fallbackDate = String(beforeEvent?.scheduled_date || "").trim();
      if (fallbackTitle) {
        const fallbackBase = {
          due_date: dueDate,
          schedule_event_id: id,
          updated_at: new Date().toISOString(),
        };
        const fallbackWithTime = await supabase
          .from("personal_tasks")
          .update({
            ...fallbackBase,
            due_time: dueTime,
          })
          .eq("user_id", session.userId)
          .is("schedule_event_id", null)
          .eq("title", fallbackTitle)
          .eq("due_date", fallbackDate)
          .select("id");

        if (fallbackWithTime.error && isMissingDueTimeColumn(fallbackWithTime.error.message || "")) {
          await supabase
            .from("personal_tasks")
            .update(fallbackBase)
            .eq("user_id", session.userId)
            .is("schedule_event_id", null)
            .eq("title", fallbackTitle)
            .eq("due_date", fallbackDate);
        }
      }
    }
  }

  const syncWarnings: string[] = [];
  try {
    const outlookStatus = await getOutlookSyncStatus(session.userId);
    if (outlookStatus.connected) {
      await syncScheduleEventToOutlook(session.userId, data);
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not sync this event to Outlook"));
  }

  try {
    const googleStatus = await getGoogleSyncStatus(session.userId);
    if (googleStatus.connected) {
      await syncScheduleEventToGoogle(session.userId, data);
    }
  } catch (syncError) {
    syncWarnings.push(String((syncError as Error)?.message || "Could not sync this event to Google Calendar"));
  }

  const { data: refreshed } = await supabase
    .from("lesson_schedule")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .single();

  return NextResponse.json({
    ok: true,
    event: refreshed || data,
    syncWarning: syncWarnings.length > 0 ? syncWarnings.join(" ") : undefined,
  });
}
