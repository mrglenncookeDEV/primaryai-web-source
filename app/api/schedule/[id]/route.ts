import { NextResponse } from "next/server";
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

  const { error } = await supabase
    .from("lesson_schedule")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Schedule store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
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
    .select("id,title,scheduled_date,start_time,event_type,event_category")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

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

  return NextResponse.json({ ok: true, event: data });
}
