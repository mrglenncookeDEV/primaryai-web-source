import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  buildOutlookEventPayload,
  buildOutlookNotes,
  createMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent,
  fetchMicrosoftCalendarView,
  graphDateTimeToScheduleParts,
  refreshMicrosoftAccessToken,
  updateMicrosoftCalendarEvent,
} from "@/lib/outlook-calendar";

const LOOKBACK_DAYS = 7;
const LOOKAHEAD_DAYS = 90;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(date: Date) {
  return date.toISOString();
}

function syncRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - LOOKBACK_DAYS);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(to.getDate() + LOOKAHEAD_DAYS);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function getConnectionRow(userId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Schedule store unavailable");
  }

  const { data, error } = await supabase
    .from("outlook_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const missingTable = String(error.message || "").toLowerCase().includes("outlook_calendar_connections");
    throw new Error(
      missingTable
        ? "Outlook sync is not ready yet. Run migration 021_outlook_calendar_sync.sql first."
        : "Outlook sync store unavailable",
    );
  }

  if (!data) {
    throw new Error("Outlook is not connected");
  }

  return { supabase, data };
}

async function ensureValidAccessToken(userId: string) {
  const { supabase, data } = await getConnectionRow(userId);

  const expiresAt = data.expires_at ? new Date(String(data.expires_at)) : null;
  const needsRefresh =
    !data.access_token ||
    !expiresAt ||
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) {
    return { supabase, connection: data, accessToken: String(data.access_token) };
  }

  if (!data.refresh_token) {
    throw new Error("Outlook connection expired. Please reconnect your Outlook calendar.");
  }

  const refreshed = await refreshMicrosoftAccessToken(String(data.refresh_token));
  const nextAccessToken = String(refreshed.access_token || "");
  const nextRefreshToken = String(refreshed.refresh_token || data.refresh_token || "");
  const expiresIn = Number(refreshed.expires_in || 3600);
  const nextExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("outlook_calendar_connections")
    .update({
      access_token: nextAccessToken,
      refresh_token: nextRefreshToken,
      expires_at: nextExpiresAt,
      scope: typeof refreshed.scope === "string" ? refreshed.scope : data.scope,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error("Could not refresh Outlook connection");
  }

  return { supabase, connection: updated, accessToken: nextAccessToken };
}

function hasOutlookWriteScope(scope?: string | null) {
  return String(scope || "")
    .toLowerCase()
    .split(/\s+/)
    .includes("calendars.readwrite");
}

type WritableScheduleEvent = {
  id: string;
  title: string;
  subject: string;
  year_group: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
  event_type?: string | null;
  event_category?: string | null;
  external_source?: string | null;
  outlook_event_id?: string | null;
};

async function listBackfillCandidates(userId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Schedule store unavailable");
  }

  const { from, to } = syncRange();
  const { data, error } = await supabase
    .from("lesson_schedule")
    .select("*")
    .eq("user_id", userId)
    .is("external_source", null)
    .gte("scheduled_date", toIsoDate(from))
    .lte("scheduled_date", toIsoDate(to))
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    const missingColumns = ["outlook_event_id"].some((column) =>
      String(error.message || "").toLowerCase().includes(column),
    );
    throw new Error(
      missingColumns
        ? "Outlook write-back is not ready yet. Run migration 022_outlook_schedule_writeback.sql first."
        : "Could not load existing scheduler events for Outlook backfill",
    );
  }

  return data || [];
}

function isMissingOutlookEventError(error: unknown) {
  const message = String((error as Error)?.message || "").toLowerCase();
  return message.includes("resource could not be discovered") || message.includes("itemnotfound");
}

export async function getOutlookSyncStatus(userId: string) {
  try {
    const { data } = await getConnectionRow(userId);
    return {
      connected: true,
      email: String(data.email || ""),
      lastSyncedAt: data.last_synced_at || null,
      scope: String(data.scope || ""),
      canWrite: hasOutlookWriteScope(String(data.scope || "")),
    };
  } catch (error) {
    const message = String((error as Error)?.message || "");
    if (message === "Outlook is not connected") {
      return { connected: false, email: "", lastSyncedAt: null, scope: "", canWrite: false };
    }
    throw error;
  }
}

export async function syncOutlookCalendar(userId: string) {
  const { supabase, accessToken } = await ensureValidAccessToken(userId);
  const { from, to } = syncRange();
  const events = await fetchMicrosoftCalendarView({
    accessToken,
    startIso: toIsoDateTime(from),
    endIso: toIsoDateTime(to),
  });

  const upserts: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();
  let skippedAllDay = 0;

  for (const event of events) {
    if (!event?.id || event?.isCancelled) continue;
    if (event?.isAllDay) {
      skippedAllDay += 1;
      continue;
    }

    const start = graphDateTimeToScheduleParts(event.start);
    const end = graphDateTimeToScheduleParts(event.end);
    if (!start || !end || start.scheduledDate !== end.scheduledDate) {
      continue;
    }

    const title = String(event.subject || "").trim() || "Outlook appointment";
    seenIds.add(String(event.id));
    upserts.push({
      user_id: userId,
      lesson_pack_id: null,
      title,
      subject: "Outlook",
      year_group: "External",
      scheduled_date: start.scheduledDate,
      start_time: `${start.time}:00`,
      end_time: `${end.time}:00`,
      notes: buildOutlookNotes(event),
      event_type: "custom",
      event_category: "outlook_import",
      external_source: "outlook",
      external_event_id: String(event.id),
    });
  }

  if (upserts.length > 0) {
    const externalIds = upserts.map((row) => String(row.external_event_id || "")).filter(Boolean);
    const { data: existingRows, error: existingLookupError } = await supabase
      .from("lesson_schedule")
      .select("id, external_event_id")
      .eq("user_id", userId)
      .eq("external_source", "outlook")
      .in("external_event_id", externalIds);

    if (existingLookupError) {
      const missingColumns = ["external_source", "external_event_id"].some((column) =>
        String(existingLookupError.message || "").toLowerCase().includes(column),
      );
      throw new Error(
        missingColumns
          ? "Outlook sync is not ready yet. Run migration 021_outlook_calendar_sync.sql first."
          : "Could not look up existing Outlook events",
      );
    }

    const existingByExternalId = new Map(
      (existingRows || []).map((row) => [String(row.external_event_id || ""), String(row.id)]),
    );

    const inserts = upserts.filter((row) => !existingByExternalId.has(String(row.external_event_id || "")));
    const updates = upserts.filter((row) => existingByExternalId.has(String(row.external_event_id || "")));

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("lesson_schedule").insert(inserts);
      if (insertError) {
        const missingColumns = ["external_source", "external_event_id"].some((column) =>
          String(insertError.message || "").toLowerCase().includes(column),
        );
        throw new Error(
          missingColumns
            ? "Outlook sync is not ready yet. Run migration 021_outlook_calendar_sync.sql first."
            : "Could not store imported Outlook events",
        );
      }
    }

    if (updates.length > 0) {
      const updateResults = await Promise.all(
        updates.map((row) =>
          supabase
            .from("lesson_schedule")
            .update({
              lesson_pack_id: null,
              title: row.title,
              subject: row.subject,
              year_group: row.year_group,
              scheduled_date: row.scheduled_date,
              start_time: row.start_time,
              end_time: row.end_time,
              notes: row.notes,
              event_type: row.event_type,
              event_category: row.event_category,
            })
            .eq("id", existingByExternalId.get(String(row.external_event_id || ""))),
        ),
      );

      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) {
        throw new Error("Could not update imported Outlook events");
      }
    }
  }

  const { data: existingImported, error: existingError } = await supabase
    .from("lesson_schedule")
    .select("id, external_event_id")
    .eq("user_id", userId)
    .eq("external_source", "outlook")
    .gte("scheduled_date", toIsoDate(from))
    .lte("scheduled_date", toIsoDate(to));

  if (existingError) {
    throw new Error("Could not load existing Outlook events");
  }

  const staleIds = (existingImported || [])
    .filter((row) => !seenIds.has(String(row.external_event_id || "")))
    .map((row) => String(row.id))
    .filter(Boolean);

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("lesson_schedule")
      .delete()
      .eq("user_id", userId)
      .in("id", staleIds);

    if (deleteError) {
      throw new Error("Could not clean up stale Outlook events");
    }
  }

  const syncedAt = new Date().toISOString();
  const { error: connectionError } = await supabase
    .from("outlook_calendar_connections")
    .update({
      last_synced_at: syncedAt,
      updated_at: syncedAt,
    })
    .eq("user_id", userId);

  if (connectionError) {
    throw new Error("Could not update Outlook sync timestamp");
  }

  return {
    importedCount: upserts.length,
    skippedAllDay,
    syncedAt,
  };
}

export async function syncScheduleEventToOutlook(userId: string, event: WritableScheduleEvent) {
  if (String(event.external_source || "").trim()) {
    return { skipped: true, reason: "imported" as const };
  }

  const { supabase, accessToken, connection } = await ensureValidAccessToken(userId);
  if (!hasOutlookWriteScope(connection?.scope)) {
    throw new Error("Outlook is connected, but write-back permission has not been granted yet. Reconnect Outlook and approve calendar write access.");
  }
  const payload = buildOutlookEventPayload({
    title: String(event.title || ""),
    subject: String(event.subject || ""),
    yearGroup: String(event.year_group || ""),
    scheduledDate: String(event.scheduled_date || ""),
    startTime: String(event.start_time || "").slice(0, 5),
    endTime: String(event.end_time || "").slice(0, 5),
    notes: event.notes ?? null,
    eventType: event.event_type ?? null,
    eventCategory: event.event_category ?? null,
  });

  const currentOutlookEventId = String(event.outlook_event_id || "").trim();
  const remote = currentOutlookEventId
    ? await updateMicrosoftCalendarEvent({
        accessToken,
        eventId: currentOutlookEventId,
        payload,
      })
        .then(() => ({ id: currentOutlookEventId }))
        .catch(async (error) => {
          if (!isMissingOutlookEventError(error)) throw error;
          return createMicrosoftCalendarEvent({
            accessToken,
            payload,
          });
        })
    : await createMicrosoftCalendarEvent({
        accessToken,
        payload,
      });

  const syncedAt = new Date().toISOString();
  const { error } = await supabase
    .from("lesson_schedule")
    .update({
      outlook_event_id: String(remote?.id || currentOutlookEventId),
      outlook_last_synced_at: syncedAt,
    })
    .eq("id", event.id)
    .eq("user_id", userId);

  if (error) {
    const missingColumns = ["outlook_event_id", "outlook_last_synced_at"].some((column) =>
      String(error.message || "").toLowerCase().includes(column),
    );
    throw new Error(
      missingColumns
        ? "Outlook write-back is not ready yet. Run migration 022_outlook_schedule_writeback.sql first."
        : "Could not store Outlook write-back state",
    );
  }

  return { syncedAt, outlookEventId: String(remote?.id || currentOutlookEventId) };
}

export async function deleteScheduleEventFromOutlook(userId: string, outlookEventId?: string | null) {
  const resolvedId = String(outlookEventId || "").trim();
  if (!resolvedId) return { skipped: true as const };

  const { accessToken } = await ensureValidAccessToken(userId);
  await deleteMicrosoftCalendarEvent({
    accessToken,
    eventId: resolvedId,
  });
  return { deleted: true as const };
}

export async function backfillExistingScheduleEventsToOutlook(userId: string) {
  const candidates = await listBackfillCandidates(userId);
  let syncedCount = 0;
  let skippedCount = 0;

  for (const event of candidates) {
    try {
      await syncScheduleEventToOutlook(userId, event as WritableScheduleEvent);
      syncedCount += 1;
    } catch (error) {
      const message = String((error as Error)?.message || "");
      if (message.toLowerCase().includes("write-back permission")) {
        throw error;
      }
      skippedCount += 1;
    }
  }

  return { syncedCount, skippedCount };
}
