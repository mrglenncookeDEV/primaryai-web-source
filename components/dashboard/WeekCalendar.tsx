"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  allDay?: boolean;
};

export type CalendarViewMode = "week" | "day" | "month" | "term";
type SchedulerFilterKey = "personal" | "tasks" | "lesson_pack" | "school" | "imports";

type CalendarTerm = {
  id: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
};

type Props = {
  events: ScheduleEvent[];
  viewMode: CalendarViewMode;
  cursorDate: Date;
  currentTerm?: CalendarTerm | null;
  layoutVersion?: number | null;
  showWeekends?: boolean;
  activeFilters?: Set<SchedulerFilterKey>;
  showViewToggle?: boolean;
  onFilterChange?: (filters: Set<SchedulerFilterKey>) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigate: (delta: -1 | 1) => void;
  onGoToday: () => void;
  onDrop: (date: string, slotTime: string) => void;
  onEmptySlotClick?: (date: string, slotTime: string) => void;
  onEventReschedule: (eventId: string, date: string, slotTime: string) => void;
  onEventDelete: (id: string) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

const HOUR_START = 0;
const SLOT_COUNT = 48;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_VISIBLE_START_HOUR = 6;
const SLOT_HEIGHT_PX = 28;

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(monday: Date, showWeekends: boolean): string {
  const periodEnd = addDays(monday, showWeekends ? 6 : 4);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${monday.toLocaleDateString("en-GB", opts)} – ${periodEnd.toLocaleDateString("en-GB", opts)}`;
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

function isImportedCalendarEvent(event: ScheduleEvent) {
  const category = String(event.eventCategory || "").toLowerCase();
  return event.eventType === "custom" && (category === "outlook_import" || category === "google_import");
}

function isBankHolidayEvent(event: ScheduleEvent) {
  const category = String(event.eventCategory || "").toLowerCase();
  return event.eventType === "custom" && (category === "bank_holiday" || String(event.subject || "").toLowerCase() === "bank holiday");
}

function eventColor(event: ScheduleEvent) {
  if (isBankHolidayEvent(event)) return "#d4a017";
  if (isImportedCalendarEvent(event)) return "#2563eb";
  if (isPersonalEvent(event)) return "#10b981";
  return subjectColor(event.subject);
}

function isPersonalEvent(event: ScheduleEvent) {
  const category = String(event.eventCategory || "").toLowerCase();
  return event.eventType === "custom" && (category === "personal" || String(event.subject || "").toLowerCase() === "personal");
}

function isTaskEvent(event: ScheduleEvent) {
  const category = String(event.eventCategory || "").toLowerCase();
  return event.eventType === "custom" && category.startsWith("task");
}

function getTermRowPriority(events: ScheduleEvent[]) {
  if (events.some((event) => isPersonalEvent(event))) return 0;
  if (events.some((event) => event.eventType !== "custom")) return 1;
  if (events.some((event) => !isImportedCalendarEvent(event) && !isTaskEvent(event) && !isBankHolidayEvent(event))) return 2;
  if (events.some((event) => isTaskEvent(event))) return 3;
  if (events.some((event) => isImportedCalendarEvent(event))) return 4;
  if (events.some((event) => isBankHolidayEvent(event))) return 5;
  return 6;
}

export default function WeekCalendar({
  events,
  viewMode,
  cursorDate,
  currentTerm = null,
  layoutVersion = null,
  showWeekends = false,
  activeFilters,
  showViewToggle = true,
  onFilterChange,
  onViewModeChange,
  onNavigate,
  onGoToday,
  onDrop,
  onEmptySlotClick,
  onEventReschedule,
  onEventDelete,
  onEventClick,
}: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startSlotMarkerRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const todayISO = toISO(new Date());
  const resolvedFilters = activeFilters ?? new Set<SchedulerFilterKey>();
  const filterLabel = resolvedFilters.size === 0
    ? "All events"
    : `${resolvedFilters.size} filter${resolvedFilters.size === 1 ? "" : "s"}`;
  const filterOptions: Array<{ key: SchedulerFilterKey; label: string }> = [
    { key: "personal", label: "Personal Events" },
    { key: "tasks", label: "Tasks" },
    { key: "lesson_pack", label: "Lesson Packs" },
    { key: "school", label: "School Events" },
    { key: "imports", label: "Calendar Imports" },
  ];

  const weekDays = useMemo(() => {
    if (viewMode === "day") {
      return [{ iso: toISO(cursorDate), date: cursorDate, label: cursorDate.toLocaleDateString("en-GB", { weekday: "short" }), dayNum: cursorDate.getDate() }];
    }
    const monday = startOfWeekMonday(cursorDate);
    return Array.from({ length: showWeekends ? 7 : 5 }, (_, i) => {
      const d = addDays(monday, i);
      return { iso: toISO(d), date: d, label: DAY_NAMES[i], dayNum: d.getDate() };
    });
  }, [cursorDate, showWeekends, viewMode]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const byDay = new Map<string, ScheduleEvent[]>();
    for (const evt of events.filter((event) => !event.allDay && !isBankHolidayEvent(event))) {
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

  const timedEvents = useMemo(
    () => events.filter((event) => !event.allDay && !isBankHolidayEvent(event)),
    [events],
  );

  const allDayEventsByDate = useMemo(() => {
    const byDate: Record<string, ScheduleEvent[]> = {};
    for (const event of events.filter((evt) => evt.allDay || isBankHolidayEvent(evt))) {
      (byDate[event.scheduledDate] ??= []).push(event);
    }
    return byDate;
  }, [events]);

  const bankHolidayDates = useMemo(() => {
    const dates = new Set<string>();
    for (const event of events) {
      if (isBankHolidayEvent(event)) {
        dates.add(event.scheduledDate);
      }
    }
    return dates;
  }, [events]);

  const allDayColumnColors = useMemo(() => {
    const byDate: Record<string, string> = {};
    for (const event of events.filter((evt) => evt.allDay || isBankHolidayEvent(evt))) {
      if (!byDate[event.scheduledDate]) {
        byDate[event.scheduledDate] = eventColor(event);
      }
    }
    return byDate;
  }, [events]);

  const eventsBySlot: Record<string, ScheduleEvent[]> = {};
  if (viewMode !== "month") {
    for (const evt of timedEvents) {
      const dayIdx = weekDays.findIndex((d) => d.iso === evt.scheduledDate);
      if (dayIdx < 0) continue;
      const slotIdx = timeToSlotIndex(evt.startTime);
      if (slotIdx < 0 || slotIdx >= SLOT_COUNT) continue;
      const key = `${dayIdx}-${slotIdx}`;
      (eventsBySlot[key] ??= []).push(evt);
    }
  }

  const monthDays = useMemo(() => (viewMode === "month" ? monthGridDays(cursorDate) : []), [cursorDate, viewMode]);

  const termDays = useMemo(() => {
    if (!currentTerm?.termStartDate || !currentTerm?.termEndDate) return [];
    const [startYear, startMonth, startDay] = currentTerm.termStartDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = currentTerm.termEndDate.split("-").map(Number);
    const start = new Date(startYear, (startMonth || 1) - 1, startDay || 1);
    const end = new Date(endYear, (endMonth || 1) - 1, endDay || 1);
    const days: Array<{ iso: string; date: Date; isWeekend: boolean; isMonday: boolean; isToday: boolean }> = [];
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const iso = toISO(cursor);
      const day = cursor.getDay();
      const entry = {
        iso,
        date: new Date(cursor),
        isWeekend: day === 0 || day === 6,
        isMonday: day === 1,
        isToday: iso === todayISO,
      };
      if (!showWeekends && entry.isWeekend) continue;
      days.push(entry);
    }
    return days;
  }, [currentTerm, showWeekends, todayISO]);

  const termEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) =>
          a.scheduledDate !== b.scheduledDate
            ? a.scheduledDate.localeCompare(b.scheduledDate)
            : a.startTime.localeCompare(b.startTime),
        ),
    [events],
  );

  const termSubjectRows = useMemo(() => {
    const FULL_DAY_MINS = 360; // 6-hour school day = 100%
    const grouped = new Map<string, ScheduleEvent[]>();
    for (const event of termEvents) {
      const key = String(event.subject || "Other").trim() || "Other";
      const arr = grouped.get(key) ?? [];
      arr.push(event);
      grouped.set(key, arr);
    }

    return Array.from(grouped.entries())
      .map(([subject, rowEvents]) => {
        const dayData = new Map<string, { mins: number; events: ScheduleEvent[] }>();
        for (const event of rowEvents) {
          const entry = dayData.get(event.scheduledDate) ?? { mins: 0, events: [] };
          if (event.allDay) {
            entry.mins += FULL_DAY_MINS;
          } else {
            const [sh, sm] = String(event.startTime || "00:00").split(":").map(Number);
            const [eh, em] = String(event.endTime || "00:00").split(":").map(Number);
            entry.mins += Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
          }
          entry.events.push(event);
          dayData.set(event.scheduledDate, entry);
        }
        return {
          subject,
          priority: getTermRowPriority(rowEvents),
          totalEvents: rowEvents.length,
          color: rowEvents.length > 0 ? eventColor(rowEvents[0]) : "#888",
          dayData,
        };
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.subject.localeCompare(b.subject);
      });
  }, [termEvents]);

  const termDayTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const event of termEvents) {
      totals.set(event.scheduledDate, (totals.get(event.scheduledDate) ?? 0) + 1);
    }
    return totals;
  }, [termEvents]);

  // Max minutes in any single day cell across all subjects — used to normalise bar heights
  const termMaxDayMins = useMemo(() => {
    let max = 60; // minimum baseline
    for (const row of termSubjectRows) {
      for (const [, entry] of row.dayData) {
        if (entry.mins > max) max = entry.mins;
      }
    }
    return max;
  }, [termSubjectRows]);

  const termColTemplate = useMemo(
    () => termDays.map(() => "minmax(28px, 1fr)").join(" "),
    [termDays],
  );

  const navLabel = useMemo(() => {
    if (viewMode === "day") return formatDayLabel(cursorDate);
    if (viewMode === "month") return formatMonthLabel(cursorDate);
    if (viewMode === "term") {
      if (!currentTerm) return "No term selected";
      return `${currentTerm.termName} · ${currentTerm.termStartDate} to ${currentTerm.termEndDate}`;
    }
    return formatWeekLabel(startOfWeekMonday(cursorDate), showWeekends);
  }, [currentTerm, cursorDate, showWeekends, viewMode]);

  useEffect(() => {
    if (viewMode === "month" || viewMode === "term") return;
    const scroll = scrollRef.current;
    const marker = startSlotMarkerRef.current;
    if (!scroll || !marker) return;
    const frame = window.requestAnimationFrame(() => {
      const headerHeight = (scroll.querySelector(".scheduler-col-header") as HTMLElement | null)?.offsetHeight ?? 0;
      const allDayHeight = (scroll.querySelector(".scheduler-all-day-label") as HTMLElement | null)?.offsetHeight ?? 0;
      // Start the visible day at 06:00 while keeping earlier slots scrollable above.
      scroll.scrollTop = Math.max(0, marker.offsetTop - headerHeight - allDayHeight);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewMode, cursorDate, showWeekends, layoutVersion]);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (filterMenuRef.current && target && !filterMenuRef.current.contains(target)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [filterMenuOpen]);

  const calendarGridStyle = useMemo(() => {
    if (viewMode === "day") {
      return { gridTemplateColumns: "66px minmax(0, 1fr)" };
    }
    if (viewMode === "term") {
      return undefined;
    }
    const dayCount = weekDays.length;
    return {
      gridTemplateColumns: `40px repeat(${dayCount}, minmax(62px, 1fr))`,
      minWidth: `${40 + dayCount * 62}px`,
    };
  }, [viewMode, weekDays.length]);

  return (
    <div className="scheduler-cal-panel">
      <div className="scheduler-week-nav" style={{ flexWrap: "wrap", rowGap: "0.45rem" }}>
        <button className="scheduler-today-btn" onClick={onGoToday}>Today</button>
        <button className="scheduler-week-btn" onClick={() => onNavigate(-1)} aria-label="Previous">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2L4 6l4 4"/></svg>
        </button>
        <button className="scheduler-week-btn" onClick={() => onNavigate(1)} aria-label="Next">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
        </button>
        <span className="scheduler-week-label">{navLabel}</span>
        {onFilterChange ? (
          <div className="scheduler-filter-dropdown" ref={filterMenuRef}>
            <button
              type="button"
              className={`scheduler-filter-dropdown-trigger${filterMenuOpen ? " is-open" : ""}`}
              onClick={() => setFilterMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={filterMenuOpen}
            >
              <span>{filterLabel}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 4.5 6 8l3.5-3.5" />
              </svg>
            </button>
            {filterMenuOpen ? (
              <div className="scheduler-filter-dropdown-menu" role="menu" aria-label="Filter timetable events">
                <button
                  type="button"
                  className={`scheduler-filter-dropdown-option${resolvedFilters.size === 0 ? " is-active" : ""}`}
                  onClick={() => {
                    onFilterChange(new Set());
                    setFilterMenuOpen(false);
                  }}
                >
                  All events
                </button>
                {filterOptions.map((option) => {
                  const checked = resolvedFilters.has(option.key);
                  return (
                    <label key={option.key} className={`scheduler-filter-dropdown-check${checked ? " is-active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(resolvedFilters);
                          if (next.has(option.key)) {
                            next.delete(option.key);
                            onFilterChange(next.size === 0 ? new Set() : next);
                            return;
                          }
                          next.add(option.key);
                          onFilterChange(next);
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {showViewToggle ? (
          <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid var(--border)", borderRadius: "999px", overflow: "hidden" }}>
            {(["week", "day", "month", "term"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                style={{
                  border: "none",
                  borderRight: mode !== "term" ? "1px solid var(--border)" : "none",
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
                      const isImported = isImportedCalendarEvent(evt);
                      const isPersonal = isPersonalEvent(evt);
                      const taskCategory = String(evt.eventCategory || "").toLowerCase();
                      const isDoneTask = taskCategory === "task_done" || /^\s*done\b/i.test(String(evt.title || ""));
                      const color = eventColor(evt);
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
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {isImported && (
                            <ScheduleEventIcon subject={evt.subject} eventType={evt.eventType} eventCategory={evt.eventCategory} size={10} style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{evt.title}</span>
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
      ) : viewMode === "term" ? (
        currentTerm && termDays.length > 0 ? (
          <div className="scheduler-term-scroll">
            <div
              className="scheduler-term-grid"
              style={{
                gridTemplateColumns: `180px ${termColTemplate}`,
                minWidth: `${180 + termDays.length * 28}px`,
              }}
            >
              <div className="scheduler-term-head scheduler-term-head-label">Subject</div>
              {termDays.map((day, dayIdx) => {
                const previousVisibleDay = dayIdx > 0 ? termDays[dayIdx - 1] : null;
                const showMonth =
                  !day.isWeekend &&
                  (!previousVisibleDay || previousVisibleDay.date.getMonth() !== day.date.getMonth());
                return (
                  <div
                    key={day.iso}
                    className={`scheduler-term-head${day.isToday ? " is-today" : ""}${day.isWeekend ? " is-weekend" : ""}${day.isMonday ? " is-week-start" : ""}${allDayColumnColors[day.iso] ? " scheduler-all-day-col" : ""}`}
                    style={allDayColumnColors[day.iso] ? { background: `color-mix(in srgb, ${allDayColumnColors[day.iso]} 12%, var(--surface))` } : undefined}
                  >
                    <span className={`scheduler-term-head-month${showMonth ? "" : " is-placeholder"}`}>
                      {showMonth ? day.date.toLocaleDateString("en-GB", { month: "short" }) : "Mmm"}
                    </span>
                    <span className="scheduler-term-head-day">{day.date.toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                    <span className="scheduler-term-head-date">{day.date.getDate()}</span>
                  </div>
                );
              })}

              {termSubjectRows.length > 0 ? termSubjectRows.map((row, rowIdx) => (
                <div key={row.subject} style={{ display: "contents" }}>
                  {/* Row label */}
                  <div
                    className={`scheduler-term-row-label scheduler-term-row-label-subject${rowIdx % 2 === 1 ? " is-alt" : ""}`}
                    style={{ borderLeft: `3px solid ${row.color}` }}
                  >
                    <span className="scheduler-term-row-icon" style={{ color: row.color }}>
                      <ScheduleEventIcon subject={row.subject} size={13} />
                    </span>
                    <span className="scheduler-term-row-text">
                      <span className="scheduler-term-row-title">{row.subject}</span>
                      <span className="scheduler-term-row-meta">
                        {row.totalEvents} {row.totalEvents === 1 ? "event" : "events"}
                      </span>
                    </span>
                  </div>
                  {/* Day cells with Gantt bars */}
                  <div
                    className="scheduler-term-row-track"
                    style={{
                      gridColumn: `2 / span ${termDays.length}`,
                      gridTemplateColumns: termColTemplate,
                    }}
                  >
                    {termDays.map((day, dayIdx) => {
                      const dayEntry = row.dayData.get(day.iso);
                      const dayTotal = termDayTotals.get(day.iso) ?? 0;
                      const barIntensity = dayEntry ? Math.min(1, dayEntry.mins / termMaxDayMins) : 0;
                      const firstEvent = dayEntry?.events[0];
                      const tooltipText = dayEntry
                        ? `${row.subject}: ${dayEntry.events.length} event${dayEntry.events.length !== 1 ? "s" : ""} · ${dayEntry.mins} min`
                        : undefined;
                      return (
                        <div
                          key={`${row.subject}-${day.iso}`}
                          className={`scheduler-term-row-cell${day.isWeekend ? " is-weekend" : ""}${day.isMonday ? " is-week-start" : ""}${dayEntry ? " has-events" : ""}${day.isToday ? " is-today-col" : ""}${rowIdx % 2 === 1 ? " is-alt" : ""}${allDayColumnColors[day.iso] ? " scheduler-all-day-col" : ""}`}
                          style={{ gridColumn: dayIdx + 1 }}
                          onClick={firstEvent ? () => onEventClick(firstEvent) : undefined}
                          title={tooltipText}
                        >
                          {dayEntry && barIntensity > 0 && (
                            <span
                              className="scheduler-gantt-bar"
                              style={{
                                height: `${Math.max(18, Math.round(barIntensity * 78))}%`,
                                background: row.color,
                                opacity: 0.55 + barIntensity * 0.35,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <>
                  <div className="scheduler-term-row-label scheduler-term-row-label-empty">No events in this term.</div>
                  <div className="scheduler-term-row-track" style={{ gridColumn: `2 / span ${termDays.length}`, gridTemplateColumns: termColTemplate }}>
                    {termDays.map((day, dayIdx) => (
                      <div
                        key={`empty-${day.iso}`}
                        className={`scheduler-term-row-cell${day.isWeekend ? " is-weekend" : ""}${day.isMonday ? " is-week-start" : ""}`}
                        style={{ gridColumn: dayIdx + 1 }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="scheduler-term-empty">
            Add term dates in Settings to use the term timeline.
          </div>
        )
      ) : (
        <div ref={scrollRef} className="scheduler-cal-scroll" style={{ overflow: "auto" }}>
          <div className="scheduler-cal-grid" style={calendarGridStyle}>
            <div className="scheduler-col-header" style={{ borderRight: "1px solid var(--border)" }} />

            {weekDays.map((day) => (
              <div
                key={day.iso}
                className={`scheduler-col-header${day.iso === todayISO ? " today today-col-outline-start" : ""}${allDayColumnColors[day.iso] ? " scheduler-all-day-col" : ""}`}
                style={allDayColumnColors[day.iso] ? { background: `color-mix(in srgb, ${allDayColumnColors[day.iso]} 10%, var(--surface))` } : undefined}
              >
                <div className="scheduler-col-header-day">{day.label}</div>
                <div className="scheduler-col-header-date">{day.dayNum}</div>
              </div>
            ))}

            <div className="scheduler-all-day-label">All day</div>
            {weekDays.map((day) => (
              <div
                key={`all-day-${day.iso}`}
                className={`scheduler-all-day-slot${day.iso === todayISO ? " today-col-outline" : ""}${allDayColumnColors[day.iso] ? " scheduler-all-day-col" : ""}`}
                style={allDayColumnColors[day.iso] ? { background: `color-mix(in srgb, ${allDayColumnColors[day.iso]} 10%, var(--surface))` } : undefined}
              >
                {(allDayEventsByDate[day.iso] ?? []).map((evt) => {
                  const color = eventColor(evt);
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      className="scheduler-all-day-event"
                      style={{
                        background: `color-mix(in srgb, ${color} 16%, var(--field-bg))`,
                        borderLeft: `3px solid ${color}`,
                      }}
                      onClick={() => onEventClick(evt)}
                    >
                      <ScheduleEventIcon subject={evt.subject} eventType={evt.eventType} eventCategory={evt.eventCategory} size={11} />
                      <span>{evt.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {SLOTS.map((slot, slotIdx) => (
              <div key={`row-${slot}`} style={{ display: "contents" }}>
                <div className="scheduler-time-label">
                  {slot.endsWith(":00") ? slot : ""}
                </div>

                {weekDays.map((day, dayIdx) => {
                  const key = `${dayIdx}-${slotIdx}`;
                  const slotEvents = eventsBySlot[key] ?? [];
                  return (
                    <div
                      ref={
                        slot === `${String(DEFAULT_VISIBLE_START_HOUR).padStart(2, "0")}:00` && dayIdx === 0
                          ? startSlotMarkerRef
                          : undefined
                      }
                      key={`${day.iso}-${slot}`}
                      className={`scheduler-slot${dragOverSlot === `${dayIdx}-${slotIdx}` ? " drag-over" : ""}${day.iso === todayISO ? " today-col-outline" : ""}${day.iso === todayISO && slotIdx === SLOT_COUNT - 1 ? " today-col-outline-end" : ""}${allDayColumnColors[day.iso] ? " scheduler-all-day-col" : ""}`}
                      style={{
                        minHeight: `${SLOT_HEIGHT_PX}px`,
                        ...(allDayColumnColors[day.iso]
                          ? { background: `color-mix(in srgb, ${allDayColumnColors[day.iso]} 8%, var(--surface))` }
                          : {}),
                      }}
                      onClick={() => {
                        if (slotEvents.length === 0) {
                          onEmptySlotClick?.(day.iso, slot);
                        }
                      }}
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
                        const isImported = isImportedCalendarEvent(evt);
                        const taskCategory = String(evt.eventCategory || "").toLowerCase();
                        const isTask = evt.eventType === "custom" && taskCategory.startsWith("task");
                        const isDoneTask = taskCategory === "task_done" || /^\s*done\b/i.test(String(evt.title || ""));
                        const isPersonal = isPersonalEvent(evt);
                        const isConflict = conflictIds.has(evt.id);
                        const isHighTask = isTask && String(evt.title || "").toLowerCase().startsWith("high priority:");
                        const color = isTask ? (isHighTask ? "#ef4444" : "#4169e1") : eventColor(evt);
                        const spanSlots = durationToSlots(evt.startTime, evt.endTime);

                        return (
                          <div
                            key={evt.id}
                            className={`scheduler-event${isDoneTask ? " is-done-task" : ""}`}
                            draggable={!isImported}
                            style={{
                              height: `calc(${spanSlots * SLOT_HEIGHT_PX}px - 2px)`,
                              background: `color-mix(in srgb, ${color} 20%, var(--surface))`,
                              borderLeft: `3px solid ${color}`,
                              color: "var(--text)",
                              boxShadow: isConflict ? "inset 0 0 0 1px #ef4444" : undefined,
                            }}
                            title={`${evt.title} · ${evt.startTime}–${evt.endTime}`}
                            onDragStart={(e) => {
                              if (isImported) {
                                e.preventDefault();
                                return;
                              }
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
                              {isImported && (
                                <ScheduleEventIcon subject={evt.subject} eventType={evt.eventType} eventCategory={evt.eventCategory} size={11} style={{ marginRight: 3, flexShrink: 0 }} />
                              )}
                              <span className="scheduler-event-title" style={{ textDecoration: isDoneTask ? "line-through" : undefined }}>{evt.title}</span>
                            </span>
                            <span className="scheduler-event-time" style={{ textDecoration: isDoneTask ? "line-through" : undefined }}>
                              {evt.startTime}–{evt.endTime}
                            </span>
                            {!isImported ? (
                              <button
                                className="scheduler-event-delete"
                                onClick={(e) => { e.stopPropagation(); onEventDelete(evt.id); }}
                                aria-label={`Remove ${evt.title}`}
                                title="Remove"
                              >
                                ×
                              </button>
                            ) : null}
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
