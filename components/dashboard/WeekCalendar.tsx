"use client";

import { useMemo, useState } from "react";
import { subjectColor } from "@/lib/subjectColor";
import { ScheduleEventIcon } from "@/lib/schedule-event-icon";

export type ScheduleEvent = {
  id: string;
  lessonPackId: string;
  title: string;
  subject: string;
  yearGroup: string;
  eventType?: "lesson_pack" | "custom";
  eventCategory?: string | null;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes?: string;
};

export type CalendarViewMode = "week" | "day" | "month";

type Props = {
  events: ScheduleEvent[];
  viewMode: CalendarViewMode;
  cursorDate: Date;
  showViewToggle?: boolean;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigate: (delta: -1 | 1) => void;
  onGoToday: () => void;
  onDrop: (date: string, slotTime: string) => void;
  onEventReschedule: (eventId: string, date: string, slotTime: string) => void;
  onEventDelete: (id: string) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

const HOUR_START = 8;
const SLOT_COUNT = 20;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function buildSlots(): string[] {
  const slots: string[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const h = HOUR_START + Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    slots.push(`${String(h).padStart(2, "0")}:${m}`);
  }
  return slots;
}
const SLOTS = buildSlots();

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeekMonday(date: Date): Date {
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

function formatWeekLabel(monday: Date): string {
  const friday = addDays(monday, 4);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${monday.toLocaleDateString("en-GB", opts)} – ${friday.toLocaleDateString("en-GB", opts)}`;
}

function formatDayLabel(day: Date): string {
  return day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function formatMonthLabel(day: Date): string {
  return day.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function timeToSlotIndex(time: string): number {
  const [h, m] = String(time || "00:00").split(":").map(Number);
  return (h - HOUR_START) * 2 + (m >= 30 ? 1 : 0);
}

function durationToSlots(start: string, end: string): number {
  const [sh, sm] = String(start || "00:00").split(":").map(Number);
  const [eh, em] = String(end || "00:00").split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(1, Math.round(mins / 30));
}

function monthGridDays(cursorDate: Date): Date[] {
  const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const start = startOfWeekMonday(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export default function WeekCalendar({
  events,
  viewMode,
  cursorDate,
  showViewToggle = true,
  onViewModeChange,
  onNavigate,
  onGoToday,
  onDrop,
  onEventReschedule,
  onEventDelete,
  onEventClick,
}: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const todayISO = toISO(new Date());

  const weekDays = useMemo(() => {
    if (viewMode === "day") {
      return [{ iso: toISO(cursorDate), date: cursorDate, label: cursorDate.toLocaleDateString("en-GB", { weekday: "short" }), dayNum: cursorDate.getDate() }];
    }
    const monday = startOfWeekMonday(cursorDate);
    return Array.from({ length: 5 }, (_, i) => {
      const d = addDays(monday, i);
      return { iso: toISO(d), date: d, label: DAY_NAMES[i], dayNum: d.getDate() };
    });
  }, [cursorDate, viewMode]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const byDay = new Map<string, ScheduleEvent[]>();
    for (const evt of events) {
      const dayEvents = byDay.get(evt.scheduledDate) ?? [];
      dayEvents.push(evt);
      byDay.set(evt.scheduledDate, dayEvents);
    }

    const toMinutes = (time: string) => {
      const [h, m] = String(time || "").split(":").map(Number);
      return h * 60 + m;
    };

    for (const [, dayEvents] of byDay) {
      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const a = dayEvents[i];
          const b = dayEvents[j];
          const aStart = toMinutes(a.startTime);
          const aEnd = toMinutes(a.endTime);
          const bStart = toMinutes(b.startTime);
          const bEnd = toMinutes(b.endTime);
          if (aStart < bEnd && bStart < aEnd) {
            ids.add(a.id);
            ids.add(b.id);
          }
        }
      }
    }
    return ids;
  }, [events]);

  const eventsBySlot: Record<string, ScheduleEvent[]> = {};
  if (viewMode !== "month") {
    for (const evt of events) {
      const dayIdx = weekDays.findIndex((d) => d.iso === evt.scheduledDate);
      if (dayIdx < 0) continue;
      const slotIdx = timeToSlotIndex(evt.startTime);
      if (slotIdx < 0 || slotIdx >= SLOT_COUNT) continue;
      const key = `${dayIdx}-${slotIdx}`;
      (eventsBySlot[key] ??= []).push(evt);
    }
  }

  const monthDays = useMemo(() => (viewMode === "month" ? monthGridDays(cursorDate) : []), [cursorDate, viewMode]);

  const navLabel = useMemo(() => {
    if (viewMode === "day") return formatDayLabel(cursorDate);
    if (viewMode === "month") return formatMonthLabel(cursorDate);
    return formatWeekLabel(startOfWeekMonday(cursorDate));
  }, [cursorDate, viewMode]);

  return (
    <div className="scheduler-cal-panel" style={{ position: "relative" }}>
      <div className="scheduler-week-nav" style={{ flexWrap: "wrap", rowGap: "0.45rem" }}>
        <button className="scheduler-today-btn" onClick={onGoToday}>Today</button>
        <button className="scheduler-week-btn" onClick={() => onNavigate(-1)} aria-label="Previous">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2L4 6l4 4"/></svg>
        </button>
        <button className="scheduler-week-btn" onClick={() => onNavigate(1)} aria-label="Next">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
        </button>
        <span className="scheduler-week-label">{navLabel}</span>

        {showViewToggle ? (
          <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            {(["week", "day", "month"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                style={{
                  border: "none",
                  borderRight: mode !== "month" ? "1px solid var(--border)" : "none",
                  background: viewMode === mode ? "var(--accent)" : "var(--surface)",
                  color: viewMode === mode ? "white" : "var(--muted)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  textTransform: "capitalize",
                  padding: "0.3rem 0.65rem",
                  cursor: "pointer",
                  textShadow: viewMode === mode ? "0 1px 0 rgb(0 0 0 / 0.22)" : undefined,
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {viewMode !== "month" && (
        <div
          className="week-cal-drag-hint"
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.6rem",
            zIndex: 12,
            pointerEvents: "none",
            fontSize: "0.68rem",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--surface) 86%, transparent)",
            borderRadius: "999px",
            padding: "0.18rem 0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          ↔ Drag and drop to schedule or reschedule
        </div>
      )}

      {viewMode === "month" ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", background: "var(--surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid var(--border)" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
              <div key={name} style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--muted)", padding: "0.4rem 0.5rem", borderRight: "1px solid var(--border)" }}>{name}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {monthDays.map((day, idx) => {
              const iso = toISO(day);
              const inMonth = day.getMonth() === cursorDate.getMonth();
              const dayEvents = events.filter((evt) => evt.scheduledDate === iso).slice(0, 3);
              return (
                <div
                  key={`${iso}-${idx}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedEventId = e.dataTransfer.getData("text/scheduler-event-id");
                    if (draggedEventId) {
                      onEventReschedule(draggedEventId, iso, "09:00");
                      return;
                    }
                    onDrop(iso, "09:00");
                  }}
                  style={{
                    minHeight: "94px",
                    borderRight: idx % 7 !== 6 ? "1px solid var(--border)" : "none",
                    borderBottom: idx < 35 ? "1px solid var(--border)" : "none",
                    padding: "0.32rem 0.38rem",
                    background: iso === todayISO ? "rgb(34 197 94 / 0.08)" : "var(--surface)",
                    opacity: inMonth ? 1 : 0.55,
                  }}
                >
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: iso === todayISO ? "#16a34a" : "var(--text)", marginBottom: "0.25rem" }}>{day.getDate()}</div>
                  <div style={{ display: "grid", gap: "0.22rem" }}>
                    {dayEvents.map((evt) => {
                      const taskCategory = String(evt.eventCategory || "").toLowerCase();
                      const isDoneTask = taskCategory === "task_done" || /^\s*done\b/i.test(String(evt.title || ""));
                      const color = subjectColor(evt.subject);
                      return (
                        <button
                          key={evt.id}
                          onClick={() => onEventClick(evt)}
                          style={{
                            border: "none",
                            textAlign: "left",
                            width: "100%",
                            cursor: "pointer",
                            background: `color-mix(in srgb, ${color} 14%, var(--field-bg))`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: "6px",
                            padding: "0.18rem 0.28rem",
                            fontSize: "0.63rem",
                            color: "var(--text)",
                            textDecoration: isDoneTask ? "line-through" : undefined,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {evt.title}
                        </button>
                      );
                    })}
                    {events.filter((evt) => evt.scheduledDate === iso).length > 3 ? (
                      <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>+ more</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="scheduler-cal-scroll">
          <div className="scheduler-cal-grid" style={{ gridTemplateColumns: viewMode === "day" ? "66px minmax(0, 1fr)" : undefined }}>
            <div className="scheduler-col-header" style={{ borderRight: "1px solid var(--border)" }} />

            {weekDays.map((day) => (
              <div key={day.iso} className={`scheduler-col-header${day.iso === todayISO ? " today today-col-outline-start" : ""}`}>
                <div className="scheduler-col-header-day">{day.label}</div>
                <div className="scheduler-col-header-date">{day.dayNum}</div>
              </div>
            ))}

            {SLOTS.map((slot, slotIdx) => (
              <div key={`row-${slot}`} style={{ display: "contents" }}>
                <div className="scheduler-time-label">{slot.endsWith(":00") ? slot : ""}</div>

                {weekDays.map((day, dayIdx) => {
                  const key = `${dayIdx}-${slotIdx}`;
                  const slotEvents = eventsBySlot[key] ?? [];
                  return (
                    <div
                      key={`${day.iso}-${slot}`}
                      className={`scheduler-slot${dragOverSlot === `${dayIdx}-${slotIdx}` ? " drag-over" : ""}${day.iso === todayISO ? " today-col-outline" : ""}${day.iso === todayISO && slotIdx === SLOT_COUNT - 1 ? " today-col-outline-end" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSlot(`${dayIdx}-${slotIdx}`); }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverSlot(null);
                        const draggedEventId = e.dataTransfer.getData("text/scheduler-event-id");
                        if (draggedEventId) {
                          onEventReschedule(draggedEventId, day.iso, slot);
                          return;
                        }
                        onDrop(day.iso, slot);
                      }}
                    >
                      {slotEvents.map((evt) => {
                        const taskCategory = String(evt.eventCategory || "").toLowerCase();
                        const isTask = evt.eventType === "custom" && taskCategory.startsWith("task");
                        const isDoneTask = taskCategory === "task_done" || /^\s*done\b/i.test(String(evt.title || ""));
                        const isPersonal =
                          (evt.eventType === "custom" && taskCategory === "personal") ||
                          String(evt.subject || "").toLowerCase() === "personal";
                        const isConflict = conflictIds.has(evt.id);
                        const isHighTask = isTask && String(evt.title || "").toLowerCase().startsWith("high priority:");
                        const color = isTask ? (isHighTask ? "#ef4444" : "#4169e1") : isPersonal ? "#9ca3af" : subjectColor(evt.subject);
                        const spanSlots = durationToSlots(evt.startTime, evt.endTime);

                        return (
                          <div
                            key={evt.id}
                            className={`scheduler-event${isDoneTask ? " is-done-task" : ""}`}
                            draggable
                            style={{
                              height: `calc(${spanSlots * 34}px - 2px)`,
                              background: `color-mix(in srgb, ${color} 20%, var(--surface))`,
                              borderLeft: `3px solid ${color}`,
                              color: "var(--text)",
                              boxShadow: isConflict ? "inset 0 0 0 1px #ef4444" : undefined,
                            }}
                            title={`${evt.title} · ${evt.startTime}–${evt.endTime}`}
                            onDragStart={(e) => {
                              if ((e.target as HTMLElement).closest(".scheduler-event-delete")) {
                                e.preventDefault();
                                return;
                              }
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/scheduler-event-id", evt.id);
                              e.dataTransfer.setData("text/plain", `scheduler-event:${evt.id}`);
                            }}
                            onClick={() => onEventClick(evt)}
                          >
                            <span className="scheduler-event-corner-icon">
                              <ScheduleEventIcon subject={evt.subject} eventType={evt.eventType} eventCategory={evt.eventCategory} size={11} />
                            </span>
                            <span className="scheduler-event-title-row">
                              <span className="scheduler-event-title" style={{ textDecoration: isDoneTask ? "line-through" : undefined }}>{evt.title}</span>
                            </span>
                            <span className="scheduler-event-time" style={{ textDecoration: isDoneTask ? "line-through" : undefined }}>
                              {evt.startTime}–{evt.endTime}
                            </span>
                            <button
                              className="scheduler-event-delete"
                              onClick={(e) => { e.stopPropagation(); onEventDelete(evt.id); }}
                              aria-label={`Remove ${evt.title}`}
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
