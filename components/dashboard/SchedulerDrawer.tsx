"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PackList, { type PackItem } from "./PackList";
import WeekCalendar, { type CalendarViewMode, type ScheduleEvent } from "./WeekCalendar";
import ScheduleModal, { type ModalPayload } from "./ScheduleModal";
import CustomEventModal from "./CustomEventModal";

type Props = {
  open?: boolean;
  onClose?: () => void;
  embedded?: boolean;
  onScheduleChange?: () => void;
  onViewModeStateChange?: (mode: CalendarViewMode) => void;
  initialPacks?: PackItem[];
  initialWeekEvents?: Array<{
    id: string;
    lesson_pack_id?: string;
    title: string;
    subject: string;
    year_group: string;
    event_type?: "lesson_pack" | "custom";
    event_category?: string | null;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    notes?: string | null;
  }>;
};

type UserTerm = {
  id: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findCurrentTerm(terms: UserTerm[], cursorDate: Date) {
  const iso = toISO(cursorDate);
  const active = terms.find((term) => iso >= term.termStartDate && iso <= term.termEndDate);
  return active ?? null;
}

function getRangeForView(mode: CalendarViewMode, cursorDate: Date, showWeekends: boolean, currentTerm: UserTerm | null) {
  const start = new Date(cursorDate);
  start.setHours(0, 0, 0, 0);
  if (mode === "day") {
    return { from: toISO(start), to: toISO(start) };
  }
  if (mode === "month") {
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { from: toISO(monthStart), to: toISO(monthEnd) };
  }
  if (mode === "term" && currentTerm) {
    return { from: currentTerm.termStartDate, to: currentTerm.termEndDate };
  }
  const monday = getMondayOf(start);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + (showWeekends ? 6 : 4));
  return { from: toISO(monday), to: toISO(weekEnd) };
}

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.min(Math.floor(total / 60), 23);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function isImportedCalendarEvent(event?: Pick<ScheduleEvent, "eventType" | "eventCategory"> | null) {
  const category = String(event?.eventCategory || "").toLowerCase();
  return event?.eventType === "custom" && (category === "outlook_import" || category === "google_import");
}

export default function SchedulerDrawer({
  open = true,
  onClose = () => {},
  embedded = false,
  onScheduleChange,
  onViewModeStateChange,
  initialPacks = [],
  initialWeekEvents = [],
}: Props) {
  const mapApiEvent = useCallback(
    (e: {
      id: string;
      lesson_pack_id?: string;
      title: string;
      subject: string;
      year_group: string;
      event_type?: "lesson_pack" | "custom";
      event_category?: string | null;
      scheduled_date: string;
      start_time: string;
      end_time: string;
      notes?: string | null;
      all_day?: boolean;
    }): ScheduleEvent => ({
      id: String(e.id),
      lessonPackId: String(e.lesson_pack_id || ""),
      title: String(e.title || ""),
      subject: String(e.subject || ""),
      yearGroup: String(e.year_group || ""),
      eventType: e.event_type === "custom" ? "custom" : "lesson_pack",
      eventCategory: e.event_category ?? null,
      scheduledDate: String(e.scheduled_date || ""),
      startTime: String(e.start_time || "").slice(0, 5),
      endTime: String(e.end_time || "").slice(0, 5),
      notes: typeof e.notes === "string" ? e.notes : "",
      allDay: Boolean(e.all_day),
    }),
    [],
  );
  const todayWeekIso = useMemo(() => toISO(getMondayOf(new Date())), []);
  const [mounted, setMounted] = useState(false);
  const [packs, setPacks] = useState<PackItem[]>(initialPacks);
  const [events, setEvents] = useState<ScheduleEvent[]>(
    initialWeekEvents.map(mapApiEvent),
  );
  const [bankHolidayEvents, setBankHolidayEvents] = useState<ScheduleEvent[]>([]);
  const [terms, setTerms] = useState<UserTerm[]>([]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [showWeekends, setShowWeekends] = useState(false);
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [packsLoading, setPacksLoading] = useState(initialPacks.length === 0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const [customModalDraft, setCustomModalDraft] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    category?: string;
    lockCategory?: boolean;
  } | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingOutlook, setSyncingOutlook] = useState(false);
  const [backfillingOutlook, setBackfillingOutlook] = useState(false);
  const [disconnectingOutlook, setDisconnectingOutlook] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [backfillingGoogle, setBackfillingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [outlookConfigured, setOutlookConfigured] = useState(true);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookCanWrite, setOutlookCanWrite] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState("");
  const [outlookLastSyncedAt, setOutlookLastSyncedAt] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCanWrite, setGoogleCanWrite] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleLastSyncedAt, setGoogleLastSyncedAt] = useState<string | null>(null);
  const [unscheduleDragOver, setUnscheduleDragOver] = useState(false);
  const [error, setError] = useState("");
  const currentTerm = useMemo(() => findCurrentTerm(terms, cursorDate), [terms, cursorDate]);

  useEffect(() => {
    onViewModeStateChange?.(viewMode);
  }, [onViewModeStateChange, viewMode]);

  const calendarEvents = useMemo(() => [...events, ...bankHolidayEvents], [events, bankHolidayEvents]);
  const dragRef = useRef<PackItem | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);
  const scheduledPackIds = useMemo(
    () =>
      Array.from(
        new Set(
          calendarEvents
            .filter((evt) => evt.eventType !== "custom" && evt.lessonPackId)
            .map((evt) => evt.lessonPackId),
        ),
      ),
    [calendarEvents],
  );

  useEffect(() => {
    if (!embedded) {
      setSidebarHeight(null);
      return;
    }

    const node = sidebarRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const syncHeight = () => {
      setSidebarHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [embedded, eventsLoading, packsLoading, outlookConnected, googleConnected]);

  // Mount guard for portal
  useEffect(() => { setMounted(true); }, []);


  // Body scroll lock
  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [embedded, open]);

  // Load packs once on first open
  const packsLoaded = useRef(initialPacks.length > 0);
  const seededWeekEvents = useRef(initialWeekEvents.length > 0);

  useEffect(() => {
    if (packs.length === 0 && initialPacks.length > 0) {
      setPacks(initialPacks);
      setPacksLoading(false);
      packsLoaded.current = true;
    }
  }, [initialPacks, packs.length]);

  useEffect(() => {
    if (events.length === 0 && viewMode === "week" && !showWeekends && toISO(getMondayOf(cursorDate)) === todayWeekIso) {
      setEvents(initialWeekEvents.map(mapApiEvent));
      seededWeekEvents.current = true;
    }
  }, [events.length, initialWeekEvents, mapApiEvent, showWeekends, todayWeekIso, viewMode, cursorDate]);

  useEffect(() => {
    if (!open || packsLoaded.current) return;
    packsLoaded.current = true;
    setPacksLoading(true);
    fetch("/api/library?view=summary&limit=200")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.items)) {
          setPacks(
            data.items.map((item: Record<string, string>) => ({
              id: item.id,
              title: item.title,
              subject: item.subject,
              yearGroup: item.year_group,
              topic: item.topic,
            }))
          );
        }
      })
      .catch(() => setError("Could not load packs."))
      .finally(() => setPacksLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/profile/terms", { cache: "no-store" })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (Array.isArray(data?.terms)) {
          setTerms(
            data.terms.map((term: Record<string, string>) => ({
              id: String(term.id || ""),
              termName: String(term.termName || ""),
              termStartDate: String(term.termStartDate || ""),
              termEndDate: String(term.termEndDate || ""),
            })),
          );
        }
      })
      .catch(() => undefined);
  }, [open]);

  // Load events for the current view range
  const loadEvents = useCallback((mode: CalendarViewMode, anchorDate: Date, includeWeekends: boolean, term: UserTerm | null) => {
    const { from, to } = getRangeForView(mode, anchorDate, includeWeekends, term);
    setEventsLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/calendar/bank-holidays?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([data, bankHolidayData]) => {
        if (data.ok && Array.isArray(data.events)) {
          setEvents(data.events.map(mapApiEvent));
        }
        if (bankHolidayData?.ok && Array.isArray(bankHolidayData.events)) {
          setBankHolidayEvents(bankHolidayData.events.map(mapApiEvent));
        } else {
          setBankHolidayEvents([]);
        }
      })
      .catch(() => setError("Could not load schedule."))
      .finally(() => setEventsLoading(false));
  }, [mapApiEvent]);

  useEffect(() => {
    if (!open) return;
    if (viewMode === "week" && !showWeekends && toISO(getMondayOf(cursorDate)) === todayWeekIso && seededWeekEvents.current) {
      seededWeekEvents.current = false;
      return;
    }
    loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
  }, [open, viewMode, cursorDate, loadEvents, showWeekends, todayWeekIso, currentTerm]);

  useEffect(() => {
    if (!open) return;
    const handleExternalRefresh = () => {
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
    };
    const handleOpenEvent = (nativeEvent: Event) => {
      const customEvent = nativeEvent as CustomEvent<{
        id: string;
        lesson_pack_id?: string;
        title: string;
        subject: string;
        year_group: string;
        event_type?: "lesson_pack" | "custom";
        event_category?: string | null;
        scheduled_date: string;
        start_time: string;
        end_time: string;
        notes?: string | null;
      }>;
      const payload = customEvent.detail;
      if (!payload?.id) return;
      const [year, month, day] = String(payload.scheduled_date || "").split("-").map(Number);
      setCursorDate(new Date(year, (month || 1) - 1, day || 1));
      setViewMode("week");
      setSelectedEvent(mapApiEvent(payload));
    };
    window.addEventListener("pa:schedule-refresh", handleExternalRefresh);
    window.addEventListener("pa:schedule-open-event", handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener("pa:schedule-refresh", handleExternalRefresh);
      window.removeEventListener("pa:schedule-open-event", handleOpenEvent as EventListener);
    };
  }, [open, loadEvents, viewMode, cursorDate, mapApiEvent, showWeekends, currentTerm]);

  const loadOutlookStatus = useCallback(async () => {
    const response = await fetch("/api/schedule/outlook-status", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Could not load Outlook sync status"));
    }

    setOutlookConfigured(Boolean(data.configured));
    setOutlookConnected(Boolean(data.connected));
    setOutlookCanWrite(Boolean(data.canWrite));
    setOutlookEmail(String(data.email || ""));
    setOutlookLastSyncedAt(data.lastSyncedAt ? String(data.lastSyncedAt) : null);
    return data;
  }, []);

  const loadGoogleStatus = useCallback(async () => {
    const response = await fetch("/api/schedule/google-status", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Could not load Google Calendar sync status"));
    }

    setGoogleConfigured(Boolean(data.configured));
    setGoogleConnected(Boolean(data.connected));
    setGoogleCanWrite(Boolean(data.canWrite));
    setGoogleEmail(String(data.email || ""));
    setGoogleLastSyncedAt(data.lastSyncedAt ? String(data.lastSyncedAt) : null);
    return data;
  }, []);

  useEffect(() => {
    if (!open) return;
    loadOutlookStatus().catch((err) => {
      const message = err instanceof Error ? err.message : "Could not load Outlook sync status";
      setError(message);
    });
    loadGoogleStatus().catch((err) => {
      const message = err instanceof Error ? err.message : "Could not load Google Calendar sync status";
      setError(message);
    });
  }, [open, loadOutlookStatus, loadGoogleStatus]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const outlookResult = url.searchParams.get("outlook");
    if (!outlookResult) return;

    const messageMap: Record<string, string> = {
      cancelled: "Outlook sign-in was cancelled.",
      expired: "Outlook sign-in expired. Please try again.",
      failed: "Outlook sign-in failed. Please try again.",
      "not-configured": "Outlook sync is not configured on this environment yet.",
      "store-unavailable": "Outlook sync store is unavailable.",
      connected: "",
    };

    const nextUrl = `${url.pathname}${url.search.replace(/([?&])outlook=[^&]*&?/, "$1").replace(/[?&]$/, "")}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);

    if (outlookResult === "connected") {
      setError("");
      loadOutlookStatus()
        .then((data) => {
          if (data?.connected) {
            loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
            onScheduleChange?.();
            return;
          }
          setError("Outlook connected, but the saved connection could not be loaded back.");
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Could not load Outlook sync status";
          setError(message);
        });
      return;
    }

    setError(messageMap[outlookResult] || outlookResult);
  }, [open, loadEvents, loadOutlookStatus, onScheduleChange, viewMode, cursorDate, showWeekends, currentTerm]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const googleResult = url.searchParams.get("google");
    if (!googleResult) return;

    const messageMap: Record<string, string> = {
      cancelled: "Google Calendar sign-in was cancelled.",
      expired: "Google Calendar sign-in expired. Please try again.",
      failed: "Google Calendar sign-in failed. Please try again.",
      "not-configured": "Google Calendar sync is not configured on this environment yet.",
      connected: "",
    };

    const nextUrl = `${url.pathname}${url.search.replace(/([?&])google=[^&]*&?/, "$1").replace(/[?&]$/, "")}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);

    if (googleResult === "connected") {
      setError("");
      loadGoogleStatus()
        .then((data) => {
          if (data?.connected) {
            loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
            onScheduleChange?.();
            return;
          }
          setError("Google Calendar connected, but the saved connection could not be loaded back.");
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Could not load Google Calendar sync status";
          setError(message);
        });
      return;
    }

    setError(messageMap[googleResult] || googleResult);
  }, [open, loadEvents, loadGoogleStatus, onScheduleChange, viewMode, cursorDate, showWeekends, currentTerm]);

  function handleNavigate(delta: -1 | 1) {
    if (viewMode === "term") {
      if (terms.length === 0) return;
      const currentIndex = currentTerm ? terms.findIndex((term) => term.id === currentTerm.id) : -1;
      const nextIndex = currentIndex < 0 ? 0 : Math.max(0, Math.min(terms.length - 1, currentIndex + delta));
      const nextTerm = terms[nextIndex];
      if (!nextTerm) return;
      const [year, month, day] = nextTerm.termStartDate.split("-").map(Number);
      setCursorDate(new Date(year, (month || 1) - 1, day || 1));
      return;
    }
    setCursorDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "day") d.setDate(d.getDate() + delta);
      else if (viewMode === "month") d.setMonth(d.getMonth() + delta);
      else d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  function handleGoToday() {
    setCursorDate(new Date());
  }

  function handleDrop(date: string, slotTime: string) {
    const pack = dragRef.current;
    if (!pack) return;
    setModal({
      pack,
      date,
      startTime: slotTime,
      endTime: addMinutes(slotTime, 60),
    });
  }

  async function handleEventReschedule(eventId: string, scheduledDate: string, startTime: string) {
    const current = events.find((evt) => evt.id === eventId);
    if (!current) return;
    if (isImportedCalendarEvent(current)) return;

    const [sh, sm] = current.startTime.split(":").map(Number);
    const [eh, em] = current.endTime.split(":").map(Number);
    const durationMinutes = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
    const nextEndTime = addMinutes(startTime, durationMinutes);

    const previous = current;
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? { ...evt, scheduledDate, startTime, endTime: nextEndTime }
          : evt,
      ),
    );

    try {
      const res = await fetch(`/api/schedule/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate,
          startTime,
          endTime: nextEndTime,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to reschedule");
      if (json?.syncWarning) {
        setError(String(json.syncWarning));
      }
      onScheduleChange?.();
    } catch {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === eventId
            ? previous
            : evt,
        ),
      );
      setError("Could not reschedule event. Please try again.");
      onScheduleChange?.();
    }
  }

  async function handleConfirm(data: { startTime: string; endTime: string; notes: string }) {
    if (!modal) return;
    setSaving(true);
    setError("");
    try {
      const isEditing = Boolean(editEventId);
      const res = await fetch(isEditing ? `/api/schedule/${editEventId}` : "/api/schedule", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                scheduledDate: modal.date,
                startTime: data.startTime,
                endTime: data.endTime,
                notes: data.notes || null,
              }
            : {
                lessonPackId: modal.pack.id,
                title: modal.pack.title,
                subject: modal.pack.subject,
                yearGroup: modal.pack.yearGroup,
                scheduledDate: modal.date,
                startTime: data.startTime,
                endTime: data.endTime,
                notes: data.notes || null,
              },
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
      if (json.syncWarning) {
        setError(String(json.syncWarning));
      }
      const e = json.event;
      const normalised = {
        id: e.id,
        lessonPackId: e.lesson_pack_id,
        title: e.title,
        subject: e.subject,
        yearGroup: e.year_group,
        eventType: (e.event_type === "custom" ? "custom" : "lesson_pack") as "custom" | "lesson_pack",
        eventCategory: e.event_category ?? null,
        scheduledDate: e.scheduled_date,
        startTime: e.start_time.slice(0, 5),
        endTime: e.end_time.slice(0, 5),
        notes: e.notes,
      };

      setEvents((prev) =>
        isEditing ? prev.map((item) => (item.id === e.id ? normalised : item)) : [...prev, normalised],
      );
      onScheduleChange?.();
      setModal(null);
      setEditEventId(null);
    } catch {
      setError(editEventId ? "Could not update event. Please try again." : "Could not save event. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEventDelete(id: string) {
    // Optimistic removal
    setEvents((prev) => prev.filter((e) => e.id !== id));
    onScheduleChange?.();
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("Delete failed");
      if (json?.syncWarning) {
        setError(String(json.syncWarning));
      }
    } catch {
      // Reload to restore correct state on failure
      setError("Could not remove event.");
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    }
  }

  async function handleCreateCustomEvent(data: {
    title: string;
    category: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    notes: string;
    allDay: boolean;
    repeat: "none" | "daily" | "weekly";
    repeatUntil: string | null;
  }) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "custom",
          eventCategory: data.category,
          title: data.title,
          subject: data.category,
          yearGroup: "All Years",
          scheduledDate: data.scheduledDate,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes || null,
          repeat: data.repeat,
          repeatUntil: data.repeatUntil,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
      if (json.syncWarning) {
        setError(String(json.syncWarning));
      }
      const createdEvents = Array.isArray(json.events)
        ? json.events
        : (json.event ? [json.event] : []);
      const normalisedEvents = createdEvents.map((event) => ({
        ...mapApiEvent(event),
        allDay:
          data.allDay ||
          (String(event.start_time || "").slice(0, 5) === "00:00" &&
            String(event.end_time || "").slice(0, 5) === "23:59"),
      }));
      setEvents((prev) => [...prev, ...normalisedEvents]);
      onScheduleChange?.();
      setCustomModalDraft(null);
    } catch {
      setError("Could not save custom event. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncOutlook() {
    setSyncingOutlook(true);
    setError("");
    try {
      if (!outlookConfigured) {
        throw new Error("Outlook sync is not configured on the server yet. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET first.");
      }

      if (outlookConnected && !outlookCanWrite) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/outlook-connect?reauth=1");
        }
        return;
      }

      if (!outlookConnected) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/outlook-connect");
        }
        return;
      }

      const res = await fetch("/api/schedule/outlook-import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not import Outlook events");
      }
      setOutlookLastSyncedAt(data?.syncedAt ? String(data.syncedAt) : new Date().toISOString());
      setOutlookConnected(true);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync Outlook. Please try again.";
      setError(message);
    } finally {
      setSyncingOutlook(false);
    }
  }

  async function handleBackfillOutlook() {
    setBackfillingOutlook(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/outlook-backfill", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not sync existing Outlook events");
      }
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync existing Outlook events.";
      setError(message);
    } finally {
      setBackfillingOutlook(false);
    }
  }

  async function handleDisconnectOutlook() {
    setDisconnectingOutlook(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/outlook-disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not disconnect Outlook");
      }
      setOutlookConnected(false);
      setOutlookCanWrite(false);
      setOutlookEmail("");
      setOutlookLastSyncedAt(null);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not disconnect Outlook.";
      setError(message);
    } finally {
      setDisconnectingOutlook(false);
    }
  }

  async function handleSyncGoogleCalendar() {
    setSyncingGoogle(true);
    setError("");
    try {
      if (!googleConfigured) {
        throw new Error("Google Calendar sync is not configured on the server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.");
      }

      if (googleConnected && !googleCanWrite) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/google-connect?reauth=1");
        }
        return;
      }

      if (!googleConnected) {
        if (typeof window !== "undefined") {
          window.location.assign("/api/schedule/google-connect");
        }
        return;
      }

      const res = await fetch("/api/schedule/google-import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not import Google Calendar events");
      }
      setGoogleLastSyncedAt(data?.syncedAt ? String(data.syncedAt) : new Date().toISOString());
      setGoogleConnected(true);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync Google Calendar. Please try again.";
      setError(message);
    } finally {
      setSyncingGoogle(false);
    }
  }

  async function handleBackfillGoogleCalendar() {
    setBackfillingGoogle(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/google-backfill", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not sync existing Google Calendar events");
      }
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sync existing Google Calendar events.";
      setError(message);
    } finally {
      setBackfillingGoogle(false);
    }
  }

  async function handleDisconnectGoogleCalendar() {
    setDisconnectingGoogle(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/google-disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not disconnect Google Calendar");
      }
      setGoogleConnected(false);
      setGoogleCanWrite(false);
      setGoogleEmail("");
      setGoogleLastSyncedAt(null);
      loadEvents(viewMode, cursorDate, showWeekends, currentTerm);
      onScheduleChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not disconnect Google Calendar.";
      setError(message);
    } finally {
      setDisconnectingGoogle(false);
    }
  }

  const selectedEventHref = useMemo(() => {
    if (!selectedEvent?.lessonPackId) return "/lesson-pack";
    return `/lesson-pack?id=${encodeURIComponent(selectedEvent.lessonPackId)}`;
  }, [selectedEvent]);

  function openEditForEvent(event: ScheduleEvent) {
    if (isImportedCalendarEvent(event)) return;
    setSelectedEvent(null);
    setEditEventId(event.id);
    setModal({
      pack: {
        id: event.lessonPackId,
        title: event.title,
        subject: event.subject,
        yearGroup: event.yearGroup,
      },
      date: event.scheduledDate,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes || "",
    });
  }

  if (!embedded && !mounted) return null;

  const schedulerBody = (
    <>
      <aside
        className={embedded ? "scheduler-inline" : `scheduler-drawer${open ? " open" : ""}`}
        aria-label="Lesson scheduler"
        aria-modal={embedded ? undefined : "true"}
        role={embedded ? "region" : "dialog"}
      >
        {/* Header */}
        <div className={`scheduler-drawer-header${embedded ? " scheduler-drawer-header-embedded" : ""}`}>
          <div className="scheduler-drawer-header-main">
            <h2 className="scheduler-drawer-title">
              <svg className="scheduler-drawer-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: "0.45rem", verticalAlign: "-2px" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              My Timetable
            </h2>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {viewMode === "week" ? (
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.95)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showWeekends}
                    onChange={(event) => setShowWeekends(event.target.checked)}
                    style={{ accentColor: "var(--accent-2)" }}
                  />
                  <span>Show weekends</span>
                </label>
              ) : null}
              <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                {(["week", "day", "month", "term"] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    style={{
                      border: "none",
                      borderRight: mode !== "term" ? "1px solid var(--border)" : "none",
                      background: viewMode === mode ? "var(--accent)" : "var(--surface)",
                      color: viewMode === mode ? "white" : "var(--muted)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      textTransform: "capitalize",
                      padding: "0.28rem 0.62rem",
                      cursor: "pointer",
                      textShadow: viewMode === mode ? "0 1px 0 rgb(0 0 0 / 0.22)" : undefined,
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            {!embedded ? (
              <button className="scheduler-close-btn" onClick={onClose} aria-label="Close scheduler">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>
              </button>
            ) : null}
          </div>
          {error ? <span className="scheduler-error-banner">{error}</span> : null}
          {eventsLoading && !error ? (
            <span className="scheduler-error-banner scheduler-error-banner-muted">Loading…</span>
          ) : null}
        </div>

        {/* Body */}
        <div
          className={`scheduler-drawer-inner${embedded ? " scheduler-drawer-inner-embedded" : ""}`}
          style={embedded && sidebarHeight ? ({ ["--scheduler-sidebar-height" as string]: `${sidebarHeight}px` }) : undefined}
        >
          <aside ref={sidebarRef} className="scheduler-sidebar">
            <div className="scheduler-sidebar-pane">
              <div className="scheduler-quick-actions">
                <button
                  className="scheduler-custom-add-btn scheduler-custom-add-btn-personal scheduler-quick-button"
                  onClick={() => setCustomModalDraft({ date: toISO(cursorDate), startTime: "09:00", endTime: "10:00", category: "Personal", lockCategory: true })}
                >
                  <span>+ Personal</span>
                </button>
                <button
                  className="scheduler-custom-add-btn scheduler-quick-button"
                  onClick={() => setCustomModalDraft({ date: toISO(cursorDate), startTime: "09:00", endTime: "10:00", category: "Meeting", lockCategory: false })}
                >
                  <span>+ School Event</span>
                </button>
                <Link
                  href="/lesson-pack?from=scheduler"
                  className="scheduler-custom-add-btn scheduler-custom-add-btn-lesson scheduler-quick-button"
                  onClick={onClose}
                  style={{ textDecoration: "none" }}
                >
                  <span className="scheduler-quick-button-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span>Add Lesson</span>
                </Link>
              </div>

              <div
                className={`scheduler-pack-unschedule-zone${unscheduleDragOver ? " drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setUnscheduleDragOver(true);
                  e.dataTransfer.dropEffect = "move";
                }}
                onDragLeave={() => setUnscheduleDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setUnscheduleDragOver(false);
                  const eventId =
                    e.dataTransfer.getData("text/scheduler-event-id") ||
                    e.dataTransfer.getData("text/plain").replace(/^scheduler-event:/, "");
                  if (!eventId) return;
                  void handleEventDelete(eventId);
                }}
              >
                Drag a scheduled event here to unschedule it
              </div>

              <div className="scheduler-sidebar-card scheduler-sidebar-packs-card">
                <div className="scheduler-sidebar-card-title">Lesson Packs</div>
                <PackList
                  packs={packs}
                  scheduledPackIds={scheduledPackIds}
                  loading={packsLoading}
                  onUnscheduleDrop={(eventId) => { void handleEventDelete(eventId); }}
                  onDragStart={(pack) => { dragRef.current = pack; }}
                  onDragEnd={() => { dragRef.current = null; }}
                  showUnscheduleZone={false}
                />
              </div>

              <div className="scheduler-sync-grid">
                <div className="scheduler-sync-tile">
                  <div className="scheduler-sync-tile-head">
                    <span className="scheduler-sync-tile-title">Outlook</span>
                    <span className={`scheduler-sync-pill${outlookConnected ? " is-live" : ""}`}>
                      {outlookConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="scheduler-sync-tile-copy">
                    {outlookConnected
                      ? `${outlookEmail || "Outlook"}${outlookLastSyncedAt ? ` · ${new Date(outlookLastSyncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`
                      : (outlookConfigured
                          ? "Import appointments as blocked time."
                          : "Not configured on this environment yet.")}
                  </p>
                  <button
                    className="scheduler-custom-sync-btn scheduler-custom-sync-btn-tile"
                    onClick={() => { void handleSyncOutlook(); }}
                    disabled={syncingOutlook}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="4" width="11" height="16" rx="2" />
                      <path d="M9 8h11" />
                      <path d="M4 7h8v10H4z" />
                      <path d="m4 12 4-3 4 3-4 3-4-3z" />
                    </svg>
                    {syncingOutlook
                      ? (outlookConnected ? "Refreshing…" : "Connecting…")
                      : (outlookConnected ? (outlookCanWrite ? "Refresh" : "Reconnect") : "Connect")}
                  </button>
                  {outlookConnected ? (
                    <div className="scheduler-sync-actions-row">
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleBackfillOutlook(); }}
                        disabled={backfillingOutlook}
                      >
                        {backfillingOutlook ? "Syncing…" : "Sync existing"}
                      </button>
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleDisconnectOutlook(); }}
                        disabled={disconnectingOutlook}
                      >
                        {disconnectingOutlook ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="scheduler-sync-tile">
                  <div className="scheduler-sync-tile-head">
                    <span className="scheduler-sync-tile-title">Google</span>
                    <span className={`scheduler-sync-pill${googleConnected ? " is-live" : ""}`}>
                      {googleConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="scheduler-sync-tile-copy">
                    {googleConnected
                      ? `${googleEmail || "Google Calendar"}${googleLastSyncedAt ? ` · ${new Date(googleLastSyncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`
                      : (googleConfigured
                          ? "Import appointments and mirror scheduler events."
                          : "Not configured on this environment yet.")}
                  </p>
                  <button
                    className="scheduler-custom-sync-btn scheduler-custom-sync-btn-tile"
                    onClick={() => { void handleSyncGoogleCalendar(); }}
                    disabled={syncingGoogle}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {syncingGoogle
                      ? (googleConnected ? "Refreshing…" : "Connecting…")
                      : (googleConnected ? (googleCanWrite ? "Refresh" : "Reconnect") : "Connect")}
                  </button>
                  {googleConnected ? (
                    <div className="scheduler-sync-actions-row">
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleBackfillGoogleCalendar(); }}
                        disabled={backfillingGoogle}
                      >
                        {backfillingGoogle ? "Syncing…" : "Sync existing"}
                      </button>
                      <button
                        className="scheduler-sync-secondary-btn scheduler-sync-secondary-btn-inline"
                        onClick={() => { void handleDisconnectGoogleCalendar(); }}
                        disabled={disconnectingGoogle}
                      >
                        {disconnectingGoogle ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <WeekCalendar
            events={calendarEvents}
            viewMode={viewMode}
            cursorDate={cursorDate}
            currentTerm={currentTerm}
            layoutVersion={sidebarHeight}
            showWeekends={showWeekends}
            showViewToggle={false}
            onViewModeChange={setViewMode}
            onNavigate={handleNavigate}
            onGoToday={handleGoToday}
            onDrop={handleDrop}
            onEmptySlotClick={(date, slotTime) => setCustomModalDraft({ date, startTime: slotTime, endTime: addMinutes(slotTime, 60), category: "Meeting", lockCategory: false })}
            onEventReschedule={handleEventReschedule}
            onEventDelete={handleEventDelete}
            onEventClick={setSelectedEvent}
          />
        </div>

        {/* Event action modal */}
        {selectedEvent && (
          <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}>
            <div className="scheduler-modal">
              <button
                type="button"
                className="scheduler-modal-x"
                aria-label="Close"
                onClick={() => setSelectedEvent(null)}
              >
                ×
              </button>
              <div>
                <span className="scheduler-modal-subject-chip">{selectedEvent.subject} · {selectedEvent.yearGroup}</span>
                <h2 className="scheduler-modal-title">{selectedEvent.title}</h2>
                <p className="scheduler-modal-date">
                  {prettyDate(selectedEvent.scheduledDate)} · {selectedEvent.startTime}-{selectedEvent.endTime}
                </p>
                {isImportedCalendarEvent(selectedEvent) ? (
                  <p className="scheduler-modal-date" style={{ marginTop: "0.35rem" }}>
                    Imported from calendar · read-only in PrimaryAI
                  </p>
                ) : null}
              </div>
              <div className="scheduler-modal-actions">
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {!isImportedCalendarEvent(selectedEvent) ? (
                    <button className="scheduler-modal-cancel" onClick={() => openEditForEvent(selectedEvent)}>
                      Edit event
                    </button>
                  ) : null}
                  {selectedEvent.lessonPackId ? (
                    <Link href={selectedEventHref} className="scheduler-modal-confirm" onClick={() => setSelectedEvent(null)}>
                      Open Full Lesson Pack
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time picker modal */}
        {modal && (
          <ScheduleModal
            payload={modal}
            saving={saving}
            mode={editEventId ? "edit" : "create"}
            onConfirm={handleConfirm}
            onCancel={() => { setModal(null); setEditEventId(null); dragRef.current = null; }}
          />
        )}
        {customModalDraft && (
          <CustomEventModal
            date={customModalDraft.date}
            initialStartTime={customModalDraft.startTime}
            initialEndTime={customModalDraft.endTime}
            initialCategory={customModalDraft.category}
            lockCategory={Boolean(customModalDraft.lockCategory)}
            saving={saving}
            onConfirm={handleCreateCustomEvent}
            onCancel={() => setCustomModalDraft(null)}
          />
        )}
      </aside>
    </>
  );

  if (embedded) {
    return schedulerBody;
  }

  return createPortal(
    <>
      <div className={`scheduler-backdrop${open ? " open" : ""}`} onClick={onClose} />
      {schedulerBody}
    </>,
    document.body
  );
}
