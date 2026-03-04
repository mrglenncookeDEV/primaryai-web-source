import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

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

  return NextResponse.json({ ok: true, event: data });
}
