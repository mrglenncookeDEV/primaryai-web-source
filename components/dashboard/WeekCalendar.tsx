"use client";

import { useState } from "react";
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
  startTime: string;     // HH:MM
  endTime: string;       // HH:MM
  notes?: string;
};

type Props = {
  events: ScheduleEvent[];
  weekStart: Date;
  onWeekChange: (delta: -1 | 1) => void;
  onGoToday: () => void;
  onDrop: (date: string, slotTime: string) => void;
  onEventReschedule: (eventId: string, date: string, slotTime: string) => void;
  onEventDelete: (id: string) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

// 08:00 → 18:00 in 30-min steps = 20 slots
const HOUR_START = 8;
const SLOT_COUNT = 20;

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

function timeToSlotIndex(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - HOUR_START) * 2 + (m >= 30 ? 1 : 0);
}

function durationToSlots(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(1, Math.round(mins / 30));
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function WeekCalendar({ events, weekStart, onWeekChange, onGoToday, onDrop, onEventReschedule, onEventDelete, onEventClick }: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const todayISO = toISO(new Date());

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { iso: toISO(d), date: d, label: DAY_NAMES[i], dayNum: d.getDate() };
  });

  const conflictIds = (() => {
    const ids = new Set<string>();
    const byDay = new Map<string, ScheduleEvent[]>();
    for (const evt of events) {
      const dayEvents = byDay.get(evt.scheduledDate) ?? [];
      dayEvents.push(evt);
      byDay.set(evt.scheduledDate, dayEvents);
    }

    const toMinutes = (time: string) => {
      const [h, m] = time.split(":").map(Number);
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
          const overlaps = aStart < bEnd && bStart < aEnd;
          if (overlaps) {
            ids.add(a.id);
            ids.add(b.id);
          }
        }
      }
    }
    return ids;
  })();

  // Map events to (dayIndex, slotIndex) for rendering
  const eventsBySlot: Record<string, ScheduleEvent[]> = {};
  for (const evt of events) {
    const dayIdx = weekDays.findIndex((d) => d.iso === evt.scheduledDate);
    if (dayIdx < 0) continue;
    const slotIdx = timeToSlotIndex(evt.startTime);
    if (slotIdx < 0 || slotIdx >= SLOT_COUNT) continue;
    const key = `${dayIdx}-${slotIdx}`;
    (eventsBySlot[key] ??= []).push(evt);
  }

  function slotKey(dayIdx: number, slotIdx: number) {
    return `${dayIdx}-${slotIdx}`;
  }

  return (
    <div className="scheduler-cal-panel" style={{ position: "relative" }}>
      {/* Week navigation */}
      <div className="scheduler-week-nav">
        <button className="scheduler-today-btn" onClick={onGoToday}>Today</button>
        <button className="scheduler-week-btn" onClick={() => onWeekChange(-1)} aria-label="Previous week">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2L4 6l4 4"/></svg>
        </button>
        <button className="scheduler-week-btn" onClick={() => onWeekChange(1)} aria-label="Next week">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
        </button>
        <span className="scheduler-week-label">{formatWeekLabel(weekStart)}</span>
      </div>

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

      {/* Calendar grid */}
      <div className="scheduler-cal-scroll">
        <div className="scheduler-cal-grid">
          {/* Corner cell */}
          <div className="scheduler-col-header" style={{ borderRight: "1px solid var(--border)" }} />

          {/* Day headers */}
          {weekDays.map((day) => (
            <div key={day.iso} className={`scheduler-col-header${day.iso === todayISO ? " today" : ""}`}>
              <div className="scheduler-col-header-day">{day.label}</div>
              <div className="scheduler-col-header-date">{day.dayNum}</div>
            </div>
          ))}

          {/* Time rows */}
          {SLOTS.map((slot, slotIdx) => (
            <div key={`row-${slot}`} style={{ display: "contents" }}>
              {/* Time label */}
              <div className="scheduler-time-label">
                {slot.endsWith(":00") ? slot : ""}
              </div>

              {/* Slot cells for each day */}
              {weekDays.map((day, dayIdx) => {
                const key = slotKey(dayIdx, slotIdx);
                const slotEvents = eventsBySlot[key] ?? [];

                return (
                  <div
                    key={`${day.iso}-${slot}`}
                    className={`scheduler-slot${dragOverSlot === `${dayIdx}-${slotIdx}` ? " drag-over" : ""}`}
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
                      const isPersonal = (evt.eventType === "custom" && String(evt.eventCategory || "").toLowerCase() === "personal")
                        || String(evt.subject || "").toLowerCase() === "personal";
                      const isConflict = conflictIds.has(evt.id);
                      const color = isPersonal ? "#9ca3af" : subjectColor(evt.subject);
                      const spanSlots = durationToSlots(evt.startTime, evt.endTime);
                      return (
                        <div
                          key={evt.id}
                          className="scheduler-event"
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
                            <ScheduleEventIcon
                              subject={evt.subject}
                              eventType={evt.eventType}
                              eventCategory={evt.eventCategory}
                              size={11}
                            />
                          </span>
                          <span className="scheduler-event-title-row">
                            <span className="scheduler-event-title">{evt.title}</span>
                            {isConflict ? (
                              <span className="scheduler-event-warning" title="Schedule overlap warning" aria-label="Schedule overlap warning">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                              </span>
                            ) : null}
                          </span>
                          <span className="scheduler-event-time">{evt.startTime}–{evt.endTime}</span>
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
    </div>
  );
}
