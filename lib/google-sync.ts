import { getSupabaseAdminClient } from "@/lib/supabase";
import { formatSupabaseError, isMissingColumnError, isMissingRelationError } from "@/lib/supabase-errors";
import {
  buildGoogleEventPayload,
  buildGoogleNotes,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  exchangeGoogleCode,
  fetchGoogleCalendarEvents,
  fetchGoogleProfile,
  googleDateTimeToScheduleParts,
  hasGoogleWriteScope,
  isGoogleCalendarConfigured,
  refreshGoogleAccessToken,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar";

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
  if (!supabase) throw new Error("Schedule store unavailable");

  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const missingTable = isMissingRelationError(error, "google_calendar_connections");
    throw new Error(
      missingTable
        ? "Google sync is not ready yet. Run migration 023_google_calendar_sync.sql first."
        : formatSupabaseError(error, "Google sync store unavailable"),
    );
  }
  if (!data) throw new Error("Google Calendar is not connected");
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
    throw new Error("Google Calendar connection expired. Please reconnect Google Calendar.");
  }

  const refreshed = await refreshGoogleAccessToken(String(data.refresh_token));
  const nextAccessToken = String(refreshed.access_token || "");
  const nextRefreshToken = String(refreshed.refresh_token || data.refresh_token || "");
  const expiresIn = Number(refreshed.expires_in || 3600);
  const nextExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("google_calendar_connections")
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

  if (updateError) throw new Error("Could not refresh Google Calendar connection");
  return { supabase, connection: updated, accessToken: nextAccessToken };
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
  google_event_id?: string | null;
};

async function listBackfillCandidates(userId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Schedule store unavailable");

  const { from, to } = syncRange();
  const { data, error } = await supabase
    .from("lesson_schedule")
    .select("*")
    .eq("user_id", userId)
    .is("external_source", null)
    .or("google_event_id.is.null,google_event_id.eq.")
    .gte("scheduled_date", toIsoDate(from))
    .lte("scheduled_date", toIsoDate(to))
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    const missingColumns = isMissingColumnError(error, "google_event_id");
    throw new Error(
      missingColumns
        ? "Google write-back is not ready yet. Run migration 023_google_calendar_sync.sql first."
        : formatSupabaseError(error, "Could not load existing scheduler events for Google backfill"),
    );
  }

  return data || [];
}

export async function getGoogleSyncStatus(userId: string) {
  try {
    const { data } = await getConnectionRow(userId);
    return {
      connected: true,
      email: String(data.email || ""),
      lastSyncedAt: data.last_synced_at || null,
      scope: String(data.scope || ""),
      canWrite: hasGoogleWriteScope(String(data.scope || "")),
      configured: isGoogleCalendarConfigured(),
    };
  } catch (error) {
    const message = String((error as Error)?.message || "");
    if (message === "Google Calendar is not connected") {
      return { connected: false, email: "", lastSyncedAt: null, scope: "", canWrite: false, configured: isGoogleCalendarConfigured() };
    }
    throw error;
  }
}

export async function disconnectGoogleCalendar(userId: string) {
  const { supabase } = await getConnectionRow(userId);

  const { error: deleteImportedError } = await supabase
    .from("lesson_schedule")
    .delete()
    .eq("user_id", userId)
    .eq("external_source", "google");

  if (deleteImportedError) {
    throw new Error("Could not remove imported Google events");
  }

  const { error: clearWritebackError } = await supabase
    .from("lesson_schedule")
    .update({
      google_event_id: null,
      google_last_synced_at: null,
    })
    .eq("user_id", userId);

  if (clearWritebackError) {
    const missingColumns = isMissingColumnError(clearWritebackError, "google_event_id", "google_last_synced_at");
    throw new Error(
      missingColumns
        ? "Google write-back is not ready yet. Run migration 023_google_calendar_sync.sql first."
        : formatSupabaseError(clearWritebackError, "Could not clear Google sync state"),
    );
  }

  const { error: deleteConnectionError } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", userId);

  if (deleteConnectionError) {
    throw new Error("Could not disconnect Google Calendar");
  }

  return { disconnected: true as const };
}

export async function storeGoogleConnection(args: {
  userId: string;
  code: string;
  baseUrl: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Schedule store unavailable");

  const tokenData = await exchangeGoogleCode({ code: args.code, baseUrl: args.baseUrl });
  const accessToken = String(tokenData.access_token || "");
  const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null;
  const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString();
  const profile = await fetchGoogleProfile(accessToken);

  const { error } = await supabase.from("google_calendar_connections").upsert(
    {
      user_id: args.userId,
      google_user_id: String(profile?.id || ""),
      email: String(profile?.email || ""),
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope: typeof tokenData.scope === "string" ? tokenData.scope : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    const missingTable = isMissingRelationError(error, "google_calendar_connections");
    throw new Error(
      missingTable
        ? "Google sync is not ready yet. Run migration 023_google_calendar_sync.sql first."
        : formatSupabaseError(error, "Could not store Google Calendar connection"),
    );
  }
}

export async function syncGoogleCalendar(userId: string) {
  const { supabase, accessToken } = await ensureValidAccessToken(userId);
  const { from, to } = syncRange();
  const fromDate = toIsoDate(from);
  const toDate = toIsoDate(to);
  const events = await fetchGoogleCalendarEvents({
    accessToken,
    startIso: toIsoDateTime(from),
    endIso: toIsoDateTime(to),
  });

  const rows: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();
  let skippedAllDay = 0;

  for (const event of events) {
    if (!event?.id || event?.status === "cancelled") continue;
    if (event?.start?.date || event?.end?.date) {
      skippedAllDay += 1;
      continue;
    }

    const start = googleDateTimeToScheduleParts(event.start);
    const end = googleDateTimeToScheduleParts(event.end);
    if (!start || !end || start.scheduledDate !== end.scheduledDate) continue;

    seenIds.add(String(event.id));
    rows.push({
      user_id: userId,
      lesson_pack_id: null,
      title: String(event.summary || "").trim() || "Google Calendar event",
      subject: "Google",
      year_group: "External",
      scheduled_date: start.scheduledDate,
      start_time: `${start.time}:00`,
      end_time: `${end.time}:00`,
      notes: buildGoogleNotes(event),
      event_type: "custom",
      event_category: "google_import",
      external_source: "google",
      external_event_id: String(event.id),
    });
  }

  const { data: mirroredRows, error: mirroredLookupError } = await supabase
    .from("lesson_schedule")
    .select("google_event_id")
    .eq("user_id", userId)
    .is("external_source", null)
    .gte("scheduled_date", fromDate)
    .lte("scheduled_date", toDate)
    .not("google_event_id", "is", null);

  if (mirroredLookupError) {
    const missingColumns = isMissingColumnError(mirroredLookupError, "google_event_id");
    throw new Error(
      missingColumns
        ? "Google write-back is not ready yet. Run migration 023_google_calendar_sync.sql first."
        : formatSupabaseError(mirroredLookupError, "Could not look up scheduler Google write-back events"),
    );
  }

  const mirroredIds = new Set(
    (mirroredRows || [])
      .map((row) => String(row.google_event_id || "").trim())
      .filter(Boolean),
  );
  const importableRows = rows.filter((row) => !mirroredIds.has(String(row.external_event_id || "").trim()));

  if (importableRows.length > 0) {
    const externalIds = importableRows.map((row) => String(row.external_event_id || "")).filter(Boolean);
    const { data: existingRows, error: lookupError } = await supabase
      .from("lesson_schedule")
      .select("id, external_event_id")
      .eq("user_id", userId)
      .eq("external_source", "google")
      .in("external_event_id", externalIds);

    if (lookupError) {
      const missingColumns = isMissingColumnError(lookupError, "external_source", "external_event_id");
      throw new Error(
        missingColumns
          ? "Google sync base schema is not ready yet. Run migration 021_outlook_calendar_sync.sql first."
          : formatSupabaseError(lookupError, "Could not look up existing Google events"),
      );
    }

    const existingByExternalId = new Map(
      (existingRows || []).map((row) => [String(row.external_event_id || ""), String(row.id)]),
    );

    const inserts = importableRows.filter((row) => !existingByExternalId.has(String(row.external_event_id || "")));
    const updates = importableRows.filter((row) => existingByExternalId.has(String(row.external_event_id || "")));

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("lesson_schedule").insert(inserts);
      if (insertError) throw new Error("Could not store imported Google events");
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
      if (updateError) throw new Error("Could not update imported Google events");
    }
  }

  const { data: existingImported, error: existingError } = await supabase
    .from("lesson_schedule")
    .select("id, external_event_id")
    .eq("user_id", userId)
    .eq("external_source", "google")
    .gte("scheduled_date", fromDate)
    .lte("scheduled_date", toDate);

  if (existingError) throw new Error("Could not load existing Google events");

  const staleIds = (existingImported || [])
    .filter((row) => {
      const externalEventId = String(row.external_event_id || "").trim();
      return mirroredIds.has(externalEventId) || !seenIds.has(externalEventId);
    })
    .map((row) => String(row.id))
    .filter(Boolean);

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("lesson_schedule")
      .delete()
      .eq("user_id", userId)
      .in("id", staleIds);
    if (deleteError) throw new Error("Could not clean up stale Google events");
  }

  const syncedAt = new Date().toISOString();
  const { error: connectionError } = await supabase
    .from("google_calendar_connections")
    .update({ last_synced_at: syncedAt, updated_at: syncedAt })
    .eq("user_id", userId);
  if (connectionError) throw new Error("Could not update Google sync timestamp");

  return { importedCount: rows.length, skippedAllDay, syncedAt };
}

export async function syncScheduleEventToGoogle(userId: string, event: WritableScheduleEvent) {
  if (String(event.external_source || "").trim()) {
    return { skipped: true as const, reason: "imported" as const };
  }
  const { supabase, accessToken, connection } = await ensureValidAccessToken(userId);
  if (!hasGoogleWriteScope(connection?.scope)) {
    throw new Error("Google Calendar is connected, but write-back permission has not been granted yet. Reconnect Google Calendar and approve calendar access.");
  }

  const payload = buildGoogleEventPayload({
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

  const currentGoogleEventId = String(event.google_event_id || "").trim();
  const remote = currentGoogleEventId
    ? await updateGoogleCalendarEvent({
        accessToken,
        eventId: currentGoogleEventId,
        payload,
      }).then(() => ({ id: currentGoogleEventId }))
    : await createGoogleCalendarEvent({
        accessToken,
        payload,
      });

  const syncedAt = new Date().toISOString();
  const { error } = await supabase
    .from("lesson_schedule")
    .update({
      google_event_id: String(remote?.id || currentGoogleEventId),
      google_last_synced_at: syncedAt,
    })
    .eq("id", event.id)
    .eq("user_id", userId);

  if (error) {
    const missingColumns = isMissingColumnError(error, "google_event_id", "google_last_synced_at");
    throw new Error(
      missingColumns
        ? "Google write-back is not ready yet. Run migration 023_google_calendar_sync.sql first."
        : formatSupabaseError(error, "Could not store Google write-back state"),
    );
  }
  return { syncedAt, googleEventId: String(remote?.id || currentGoogleEventId) };
}

export async function deleteScheduleEventFromGoogle(userId: string, googleEventId?: string | null) {
  const resolvedId = String(googleEventId || "").trim();
  if (!resolvedId) return { skipped: true as const };
  const { accessToken } = await ensureValidAccessToken(userId);
  await deleteGoogleCalendarEvent({ accessToken, eventId: resolvedId });
  return { deleted: true as const };
}

export async function backfillExistingScheduleEventsToGoogle(userId: string) {
  const candidates = await listBackfillCandidates(userId);
  let syncedCount = 0;
  let skippedCount = 0;

  for (const event of candidates) {
    try {
      await syncScheduleEventToGoogle(userId, event as WritableScheduleEvent);
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
