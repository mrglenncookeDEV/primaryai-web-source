"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PackList, { type PackItem } from "./PackList";
import WeekCalendar, { type ScheduleEvent } from "./WeekCalendar";
import ScheduleModal, { type ModalPayload } from "./ScheduleModal";
import CustomEventModal from "./CustomEventModal";

type Props = {
  open: boolean;
  onClose: () => void;
  onScheduleChange?: () => void;
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

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
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

export default function SchedulerDrawer({ open, onClose, onScheduleChange, initialPacks = [], initialWeekEvents = [] }: Props) {
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
    }),
    [],
  );
  const todayWeekIso = useMemo(() => toISO(getMondayOf(new Date())), []);
  const [mounted, setMounted] = useState(false);
  const [packs, setPacks] = useState<PackItem[]>(initialPacks);
  const [events, setEvents] = useState<ScheduleEvent[]>(
    initialWeekEvents.map(mapApiEvent),
  );
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [packsLoading, setPacksLoading] = useState(initialPacks.length === 0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const [customModalDate, setCustomModalDate] = useState<string | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingOutlook, setSyncingOutlook] = useState(false);
  const [error, setError] = useState("");

  const dragRef = useRef<PackItem | null>(null);
  const scheduledPackIds = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .filter((evt) => evt.eventType !== "custom" && evt.lessonPackId)
            .map((evt) => evt.lessonPackId),
        ),
      ),
    [events],
  );

  // Mount guard for portal
  useEffect(() => { setMounted(true); }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    if (events.length === 0 && toISO(weekStart) === todayWeekIso) {
      setEvents(initialWeekEvents.map(mapApiEvent));
      seededWeekEvents.current = true;
    }
  }, [events.length, initialWeekEvents, mapApiEvent, todayWeekIso, weekStart]);

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

  // Load events for the current week
  const loadEvents = useCallback((monday: Date) => {
    setEventsLoading(true);
    setError("");
    fetch(`/api/schedule?weekStart=${toISO(monday)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.events)) {
          setEvents(data.events.map(mapApiEvent));
        }
      })
      .catch(() => setError("Could not load schedule."))
      .finally(() => setEventsLoading(false));
  }, [mapApiEvent]);

  useEffect(() => {
    if (!open) return;
    if (toISO(weekStart) === todayWeekIso && seededWeekEvents.current) {
      seededWeekEvents.current = false;
      return;
    }
    loadEvents(weekStart);
  }, [open, weekStart, loadEvents, todayWeekIso]);

  function handleWeekChange(delta: -1 | 1) {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  function handleGoToday() {
    setWeekStart(getMondayOf(new Date()));
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
    onScheduleChange?.();

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
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      // Reload to restore correct state on failure
      setError("Could not remove event.");
      loadEvents(weekStart);
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
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to save");
      const e = json.event;
      setEvents((prev) => [
        ...prev,
        {
          id: e.id,
          lessonPackId: e.lesson_pack_id || "",
          title: e.title,
          subject: e.subject,
          yearGroup: e.year_group,
          eventType: (e.event_type === "custom" ? "custom" : "lesson_pack") as "custom" | "lesson_pack",
          eventCategory: e.event_category ?? null,
          scheduledDate: e.scheduled_date,
          startTime: e.start_time.slice(0, 5),
          endTime: e.end_time.slice(0, 5),
          notes: e.notes,
        },
      ]);
      onScheduleChange?.();
      setCustomModalDate(null);
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
      const res = await fetch("/api/schedule/outlook-link");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.outlookSubscribeUrl) {
        throw new Error(data?.error || "Could not create Outlook sync link");
      }
      if (typeof window !== "undefined") {
        const opened = window.open(data.outlookSubscribeUrl, "_blank", "noopener,noreferrer");
        if (!opened && data?.icsUrl) {
          await navigator.clipboard.writeText(data.icsUrl).catch(() => {});
          setError("Popup blocked. Calendar feed link copied to clipboard - paste it into Outlook 'Add calendar from internet'.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open Outlook sync. Please try again.";
      setError(message);
    } finally {
      setSyncingOutlook(false);
    }
  }

  const selectedEventHref = useMemo(() => {
    if (!selectedEvent?.lessonPackId) return "/lesson-pack";
    return `/lesson-pack?id=${encodeURIComponent(selectedEvent.lessonPackId)}`;
  }, [selectedEvent]);

  function openEditForEvent(event: ScheduleEvent) {
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

  if (!mounted) return null;

  return createPortal(
    <>
      <div className={`scheduler-backdrop${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`scheduler-drawer${open ? " open" : ""}`} aria-label="Lesson scheduler" aria-modal="true" role="dialog">
        {/* Header */}
        <div className="scheduler-drawer-header">
          <h2 className="scheduler-drawer-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: "0.45rem", verticalAlign: "-2px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            Lesson Scheduler
          </h2>
          {error && <span className="scheduler-error-banner">{error}</span>}
          {eventsLoading && !error && (
            <span className="scheduler-error-banner" style={{ color: "var(--muted)" }}>Loading…</span>
          )}
          <button className="scheduler-close-btn" onClick={onClose} aria-label="Close scheduler">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="scheduler-drawer-inner">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: 0 }}>
            <button
              className="scheduler-custom-sync-btn"
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
              {syncingOutlook ? "Preparing Outlook link…" : "Sync with Outlook"}
            </button>
            <button
              className="scheduler-custom-add-btn"
              onClick={() => setCustomModalDate(toISO(weekStart))}
            >
              Add custom event
            </button>
            <Link
              href="/lesson-pack?from=scheduler"
              className="scheduler-custom-add-btn"
              onClick={onClose}
              style={{ textDecoration: "none", textAlign: "center" as const }}
            >
              New lesson
            </Link>
            <PackList
              packs={packs}
              scheduledPackIds={scheduledPackIds}
              loading={packsLoading}
              onUnscheduleDrop={(eventId) => { void handleEventDelete(eventId); }}
              onDragStart={(pack) => { dragRef.current = pack; }}
              onDragEnd={() => { dragRef.current = null; }}
            />
          </div>

          <WeekCalendar
            events={events}
            weekStart={weekStart}
            onWeekChange={handleWeekChange}
            onGoToday={handleGoToday}
            onDrop={handleDrop}
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
              </div>
              <div className="scheduler-modal-actions">
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="scheduler-modal-cancel" onClick={() => openEditForEvent(selectedEvent)}>
                    Edit event
                  </button>
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
        {customModalDate && (
          <CustomEventModal
            date={customModalDate}
            saving={saving}
            onConfirm={handleCreateCustomEvent}
            onCancel={() => setCustomModalDate(null)}
          />
        )}
      </aside>
    </>,
    document.body
  );
}
