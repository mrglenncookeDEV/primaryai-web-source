"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { subjectColor } from "@/lib/subjectColor";
import { ScheduleEventIcon } from "@/lib/schedule-event-icon";
import { TermCountdownRing } from "@/components/dashboard/TermCountdownRing";
import { DashboardClock } from "@/components/dashboard/DashboardClock";


const SchedulerDrawer = dynamic(() => import("@/components/dashboard/SchedulerDrawer"), {
  ssr: false,
});

type LibraryItem = {
  id: string;
  title: string;
  yearGroup: string;
  subject: string;
  topic: string;
  createdAt: string;
};

function normaliseLibraryItems(rawItems: unknown): LibraryItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item: any) => ({
    id: String(item?.id ?? ""),
    title: String(item?.title ?? ""),
    yearGroup: String(item?.yearGroup ?? item?.year_group ?? ""),
    subject: String(item?.subject ?? ""),
    topic: String(item?.topic ?? ""),
    createdAt: String(item?.createdAt ?? item?.created_at ?? ""),
  })).filter((item) => item.id);
}

type ScheduleEvent = {
  id: string;
  lesson_pack_id?: string;
  title: string;
  subject: string;
  year_group: string;
  event_type?: "lesson_pack" | "custom";
  event_category?: string | null;
  scheduled_date: string; // YYYY-MM-DD
  start_time: string;     // HH:MM:SS
  end_time: string;
  notes?: string | null;
};

type PersonalTask = {
  id: string;
  title: string;
  due_date: string;
  due_time?: string | null;
  importance: "low" | "high";
  completed: boolean;
  schedule_event_id?: string | null;
  created_at: string;
  updated_at: string;
};

type DashboardSummaryPayload = {
  userId?: string;
  email?: string;
  profileSetup?: {
    displayName?: string;
    avatarUrl?: string;
  };
  libraryItems?: unknown[];
  scheduleEvents?: ScheduleEvent[];
  upNextEvents?: ScheduleEvent[];
  tasks?: PersonalTask[];
  activeTerm?: {
    termName?: string;
    termStartDate?: string;
    termEndDate?: string;
    daysRemaining?: number;
  } | null;
};

type DashboardBootStep = {
  id: "settings" | "lessons" | "schedule" | "tasks";
  label: string;
  status: "pending" | "active" | "done";
};

function HouseDrawSVG() {
  return (
    <svg
      className="page-loader-house"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      <path className="pl-stroke pl-s1" pathLength="1" d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5" />
      <path className="pl-stroke pl-s2" pathLength="1" d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12" />
      <path className="pl-stroke pl-s3" pathLength="1" d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12" />
      <path className="pl-stroke pl-s4" pathLength="1" d="M12,12.2 v8.1" />
      <path className="pl-stroke pl-s5" pathLength="1" d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12" />
    </svg>
  );
}

function DashboardBootSplash({ steps }: { steps: DashboardBootStep[] }) {
  const activeStep = steps.find((step) => step.status === "active");
  return (
    <main className="page-wrap">
      <div className="page-loader">
        <div className="page-loader-inner dashboard-boot-inner">
          <HouseDrawSVG />
          <div className="page-loader-wordmark">
            Primary<span className="page-loader-ai">AI</span>
          </div>
          <div className="dashboard-boot-status" role="status" aria-live="polite">
            {activeStep ? activeStep.label : "Preparing dashboard"}
          </div>
          <div className="dashboard-boot-progress">
            {steps.map((step) => (
              <div key={step.id} className={`dashboard-boot-step is-${step.status}`}>
                <span className="dashboard-boot-step-dot" />
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function isImportedCalendarScheduleEvent(event: Pick<ScheduleEvent, "event_type" | "event_category">) {
  const category = String(event.event_category || "").toLowerCase();
  return event.event_type === "custom" && (category === "outlook_import" || category === "google_import");
}

function isPersonalScheduleEvent(event: Pick<ScheduleEvent, "event_type" | "event_category" | "subject">) {
  const category = String(event.event_category || "").toLowerCase();
  return event.event_type === "custom" && (category === "personal" || String(event.subject || "").toLowerCase() === "personal");
}

function scheduleEventAccentColor(event: Pick<ScheduleEvent, "event_type" | "event_category" | "subject">) {
  if (isImportedCalendarScheduleEvent(event)) return "#2563eb";
  if (isPersonalScheduleEvent(event)) return "#10b981";
  return subjectColor(event.subject);
}

function isTaskScheduleEvent(event: Pick<ScheduleEvent, "event_type" | "event_category">) {
  const category = String(event.event_category || "").toLowerCase();
  return event.event_type === "custom" && category.startsWith("task");
}

function isLessonSubjectActivityEvent(event: Pick<ScheduleEvent, "event_type" | "event_category" | "subject">) {
  if (event.event_type !== "lesson_pack") return false;
  if (isImportedCalendarScheduleEvent(event)) return false;
  if (isPersonalScheduleEvent(event)) return false;
  if (isTaskScheduleEvent(event)) return false;
  return true;
}

function formatShortUkDate(iso: string) {
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const DASHBOARD_CACHE_KEY = "pa_dashboard_summary_v2";

function getMondayISO(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().split("T")[0];
}

function getMondayDate(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function toISODate(date: Date) {
  return date.toISOString().split("T")[0];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Schedule widget ───────────────────────────────────────────────────────────

function ScheduleWidget({ onOpen, events, scheduleLoading }: { onOpen: () => void; events: ScheduleEvent[]; scheduleLoading: boolean }) {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const nowISO = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const todayEvents = events
    .filter((e) => e.scheduled_date === nowISO)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const upcoming = events
    .filter((e) =>
      e.scheduled_date > nowISO ||
      (e.scheduled_date === nowISO && e.start_time.slice(0, 5) >= nowTime)
    )
    .sort((a, b) =>
      a.scheduled_date !== b.scheduled_date
        ? a.scheduled_date.localeCompare(b.scheduled_date)
        : a.start_time.localeCompare(b.start_time)
    );

  const count = events.length;
  const nextUpcoming = upcoming[0] ?? null;
  const carouselEvents = upcoming.slice(0, 12);
  const conflictIds = (() => {
    const ids = new Set<string>();
    const byDay = new Map<string, ScheduleEvent[]>();
    for (const evt of events) {
      const dayEvents = byDay.get(evt.scheduled_date) ?? [];
      dayEvents.push(evt);
      byDay.set(evt.scheduled_date, dayEvents);
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
          const aStart = toMinutes(a.start_time);
          const aEnd = toMinutes(a.end_time);
          const bStart = toMinutes(b.start_time);
          const bEnd = toMinutes(b.end_time);
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

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === nowISO) return "Today";
    if (iso === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  function scrollCarousel(direction: -1 | 1) {
    const node = carouselRef.current;
    if (!node) return;
    const amount = Math.max(220, Math.floor(node.clientWidth * 0.85));
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.25rem 1.4rem",
        borderRadius: "18px",
        border: "1px solid var(--border-card)",
        background: "var(--surface)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left" as const,
        width: "100%",
        transition: "border-color 160ms ease, transform 120ms ease, box-shadow 160ms ease",
        position: "relative" as const,
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgb(var(--accent-rgb) / 0.5)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 28px rgb(0 0 0 / 0.08)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border-card)";
        el.style.transform = "";
        el.style.boxShadow = "";
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, var(--accent) 0%, transparent 80%)" }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
            This Week's Schedule
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </div>

      {/* Big count + subtitle */}
      {scheduleLoading ? (
        <div style={{ height: "2.8rem", borderRadius: "8px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite", width: "45%" }} />
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
          <p style={{ margin: 0, fontSize: "2.8rem", fontWeight: 300, letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1 }}>{count}</p>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
              {count === 1 ? "lesson" : "lessons"}
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: todayEvents.length > 0 ? "var(--accent)" : "var(--muted)", fontWeight: todayEvents.length > 0 ? 600 : 400 }}>
              {todayEvents.length > 0 ? `${todayEvents.length} today` : "scheduled this week"}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming carousel */}
      {!scheduleLoading && (
        <div style={{ display: "grid", gap: "0.45rem" }}>
          {carouselEvents.length > 0 ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.7rem" }}>
                <p style={{ margin: "0 0 0.1rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
                  {nextUpcoming ? `Next · ${fmtDate(nextUpcoming.scheduled_date)}` : "Upcoming"}
                </p>
                <div className="schedule-carousel-controls">
                  <button
                    type="button"
                    className="schedule-carousel-arrow"
                    aria-label="Previous upcoming events"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollCarousel(-1);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="schedule-carousel-arrow"
                    aria-label="Next upcoming events"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollCarousel(1);
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
              <div
                ref={carouselRef}
                className="schedule-carousel-track"
                onClick={(e) => e.stopPropagation()}
              >
                {carouselEvents.map((evt) => {
                  const taskCategory = String(evt.event_category || "").toLowerCase();
                  const isTask = evt.event_type === "custom" && taskCategory.startsWith("task");
                  const isDoneTask = taskCategory === "task_done" || /^\s*done\b/i.test(String(evt.title || ""));
                  const isImportedCalendar = evt.event_type === "custom" && (taskCategory === "outlook_import" || taskCategory === "google_import");
                  const isPersonal = (evt.event_type === "custom" && String(evt.event_category || "").toLowerCase() === "personal")
                    || String(evt.subject || "").toLowerCase() === "personal";
                  const isConflict = conflictIds.has(evt.id);
                  const isHighTask = isTask && String(evt.title || "").toLowerCase().startsWith("high priority:");
                  const color = isImportedCalendar
                    ? "#2563eb"
                    : isTask
                    ? (isHighTask ? "#ef4444" : "#4169e1")
                    : isPersonal
                      ? "#10b981"
                      : subjectColor(evt.subject);
                  return (
                    <div
                      key={evt.id}
                      className="schedule-carousel-item"
                      style={{
                        background: `color-mix(in srgb, ${color} 8%, var(--field-bg))`,
                        borderLeft: `3px solid ${color}`,
                        boxShadow: isConflict ? "inset 0 0 0 1px #ef4444" : undefined,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: "0.35rem", textDecoration: isDoneTask ? "line-through" : undefined }}>
                          <ScheduleEventIcon
                            subject={evt.subject}
                            eventType={evt.event_type}
                            eventCategory={evt.event_category}
                            size={12}
                          />
                          {isConflict ? (
                            <span style={{ color: "#ef4444", display: "inline-flex", alignItems: "center" }} title="Schedule overlap warning" aria-label="Schedule overlap warning">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            </span>
                          ) : null}
                          {evt.title}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.66rem", color: "var(--muted)", textDecoration: isDoneTask ? "line-through" : undefined }}>
                          {fmtDate(evt.scheduled_date)} · {evt.start_time.slice(0, 5)}–{evt.end_time.slice(0, 5)}
                        </p>
                      </div>
                      <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "5px", background: `color-mix(in srgb, ${color} 15%, transparent)`, color, flexShrink: 0 }}>
                        {evt.subject.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "0.77rem", color: "var(--muted)", fontStyle: "italic" }}>
              No upcoming lessons — open to drag &amp; drop
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Library overview ──────────────────────────────────────────────────────────

function LibraryOverview({ items, loading }: { items: LibraryItem[]; loading: boolean }) {
  // Subject breakdown
  const subjectCounts = items.reduce((acc, item) => {
    acc[item.subject] = (acc[item.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = sortedSubjects[0]?.[1] || 1;
  const total = items.length;

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.85rem" }}>
      {/* Subject bars */}
      <div style={{
        borderRadius: "16px",
        border: "1px solid var(--border-card)",
        background: "var(--surface)",
        padding: "1.2rem 1.4rem",
        position: "relative" as const,
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #60a5fa 0%, #a78bfa 60%, transparent 100%)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
            Subject Coverage
          </p>
          {!loading && total > 0 && (
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem",
              borderRadius: "999px", background: "var(--field-bg)",
              color: "var(--text)", border: "1px solid var(--border)",
            }}>
              {total} {total === 1 ? "pack" : "packs"}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "70px", height: "9px", borderRadius: "5px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                <div style={{ flex: 1, height: "9px", borderRadius: "5px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite", width: `${65 - i * 12}%`, animationDelay: `${i * 0.12}s` }} />
              </div>
            ))}
          </div>
        ) : sortedSubjects.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>No packs yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {sortedSubjects.map(([subject, count]) => {
              const color = subjectColor(subject);
              const pct = (count / maxCount) * 100;
              const sharePct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={subject} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {/* Subject label */}
                  <span style={{ width: "76px", fontSize: "0.78rem", color: "var(--text)", fontWeight: 500, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {subject}
                  </span>
                  {/* Bar track */}
                  <div style={{ flex: 1, height: "9px", borderRadius: "5px", background: "var(--border)", overflow: "hidden", position: "relative" as const }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: "5px",
                      background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 75%, white) 100%)`,
                      transition: "width 700ms cubic-bezier(0.4,0,0.2,1) 100ms",
                    }} />
                  </div>
                  {/* Count + share */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0, minWidth: "52px", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)" }}>{count}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{sharePct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

function ActivityBySubjectCard({
  scheduleEvents,
  loading,
  weekStart,
}: {
  scheduleEvents: ScheduleEvent[];
  loading: boolean;
  weekStart: Date;
}) {
  const lessonSubjectEvents = useMemo(
    () => scheduleEvents.filter((event) => isLessonSubjectActivityEvent(event)),
    [scheduleEvents],
  );
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const weekIsoSet = new Set(weekDays.map((day) => day.toISOString().split("T")[0]));
  const daySubjectCounts = weekDays.map((day) => {
    const iso = day.toISOString().split("T")[0];
    const bySubject = lessonSubjectEvents.reduce((acc, evt) => {
      if (String(evt.scheduled_date || "") !== iso) return acc;
      const subject = String(evt.subject || "Other");
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalForDay = Object.values(bySubject).reduce((sum, value) => sum + value, 0);
    return { iso, bySubject, totalForDay };
  });
  const weeklySubjectCounts = lessonSubjectEvents.reduce((acc, evt) => {
    const iso = String(evt.scheduled_date || "");
    if (!weekIsoSet.has(iso)) return acc;
    const subject = String(evt.subject || "Other");
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topSubjects = Object.entries(weeklySubjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subject]) => subject);
  const dailyStacks = daySubjectCounts.map((day) => {
    let otherCount = 0;
    const segments = topSubjects.reduce((acc, subject) => {
      const count = day.bySubject[subject] || 0;
      if (count > 0) acc.push({ subject, count, color: subjectColor(subject) });
      return acc;
    }, [] as Array<{ subject: string; count: number; color: string }>);

    Object.entries(day.bySubject).forEach(([subject, count]) => {
      if (!topSubjects.includes(subject)) otherCount += count;
    });

    if (otherCount > 0) {
      segments.push({ subject: "Other", count: otherCount, color: "#94a3b8" });
    }

    return {
      iso: day.iso,
      total: day.totalForDay,
      segments,
    };
  });
  const dailyCounts = dailyStacks.map((day) => day.total);
  const maxDaily = Math.max(...dailyCounts, 1);
  const thisWeek = dailyCounts.reduce((a, b) => a + b, 0);
  const dayLabels = weekDays.map((d) => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()]);
  const todayIso = toISODate(new Date());
  const stackLegend = [
    ...topSubjects.map((subject) => ({ subject, color: subjectColor(subject), count: weeklySubjectCounts[subject] || 0 })),
    ...(Object.keys(weeklySubjectCounts).some((subject) => !topSubjects.includes(subject))
      ? [{ subject: "Other", color: "#94a3b8", count: Object.entries(weeklySubjectCounts).reduce((sum, [subject, count]) => topSubjects.includes(subject) ? sum : sum + count, 0) }]
      : []),
  ].filter((item) => item.count > 0);

  return (
    <div className="dashboard-hero-stat" style={{
      borderRadius: "16px",
      border: "1px solid var(--border-card)",
      background: "var(--surface)",
      padding: "1.2rem 1.2rem 1rem",
      position: "relative" as const,
      overflow: "hidden",
      height: "100%",
      boxSizing: "border-box" as const,
      display: "flex",
      flexDirection: "column" as const,
    }}>
      <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #0ea5e9 0%, #14b8a6 60%, transparent 100%)" }} />

      <p style={{ margin: "0 0 0.1rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)" }}>Activity by Subject</p>

      {loading ? (
        <div style={{ flex: 1 }}>
          <div style={{ height: "2rem", borderRadius: "6px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite", width: "50%", marginBottom: "0.5rem" }} />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", margin: "0.3rem 0 auto" }}>
            <span style={{ fontSize: "2.4rem", fontWeight: 300, letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1 }}>{thisWeek}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>this week</span>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "56px" }}>
              {dailyStacks.map((day, i) => {
                const isToday = day.iso === todayIso;
                const heightPct = day.total > 0 ? Math.max(18, (day.total / maxDaily) * 100) : 10;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      borderRadius: "4px 4px 2px 2px",
                      background: day.total > 0 ? "transparent" : "var(--border)",
                      border: day.total > 0 ? "1px solid color-mix(in srgb, var(--border-card) 75%, transparent)" : "none",
                      transition: "height 500ms cubic-bezier(0.4,0,0.2,1) 200ms",
                      position: "relative" as const,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column-reverse",
                    }}>
                      {day.segments.map((segment, segmentIndex) => (
                        <span
                          key={`${segment.subject}-${segmentIndex}`}
                          style={{
                            display: "block",
                            width: "100%",
                            height: `${(segment.count / day.total) * 100}%`,
                            background: segment.color,
                            opacity: isToday ? 1 : 0.9,
                          }}
                          title={`${segment.subject}: ${segment.count}`}
                        />
                      ))}
                      {day.total > 0 && (
                        <span style={{
                          position: "absolute" as const,
                          bottom: "calc(100% + 2px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          color: isToday ? "var(--accent)" : "var(--muted)",
                          whiteSpace: "nowrap" as const,
                        }}>{day.total}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "5px" }}>
              {dayLabels.map((label, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: "center" as const,
                  fontSize: "0.58rem",
                  color: dailyStacks[i]?.iso === todayIso ? "var(--accent)" : "var(--muted)",
                  fontWeight: dailyStacks[i]?.iso === todayIso ? 700 : 400,
                }}>{label}</div>
              ))}
            </div>
            {stackLegend.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 0.7rem", marginTop: "0.55rem" }}>
                {stackLegend.map((item) => (
                  <span key={item.subject} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.62rem", color: "var(--muted)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: item.color, display: "inline-block" }} />
                    {item.subject}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatUpNextTileDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const todayIso = toISODate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === todayIso) return "Today";
  if (iso === toISODate(tomorrow)) return "Tomorrow";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function UpNextCarouselSection({
  heading,
  events,
  loading,
  index,
  onPrevious,
  onNext,
  emptyText,
  loadingText,
}: {
  heading: string;
  events: ScheduleEvent[];
  loading: boolean;
  index: number;
  onPrevious: () => void;
  onNext: () => void;
  emptyText: string;
  loadingText: string;
}) {
  const event = events[index] ?? null;

  const accent = event ? scheduleEventAccentColor(event) : undefined;

  return (
    <div className="dashboard-upnext-section">
      <div className="dashboard-upnext-section-head">
        <span className="dashboard-upnext-section-label">{heading}</span>
        {!loading && events.length > 1 && (
          <div className="dashboard-upnext-arrows">
            <button
              type="button"
              className="dashboard-upnext-arrow"
              aria-label={`Previous ${heading.toLowerCase()}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPrevious(); }}
              disabled={index === 0}
            >‹</button>
            <span className="dashboard-upnext-position">{index + 1} / {events.length}</span>
            <button
              type="button"
              className="dashboard-upnext-arrow"
              aria-label={`Next ${heading.toLowerCase()}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNext(); }}
              disabled={index >= events.length - 1}
            >›</button>
          </div>
        )}
      </div>
      {!loading && event ? (
        <div
          key={event.id}
          className="dashboard-upnext-card"
          role="button"
          tabIndex={0}
          style={{
            background: `color-mix(in srgb, ${accent} 9%, var(--field-bg))`,
            borderLeft: `3px solid ${accent}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("pa:schedule-open-event", { detail: event }));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("pa:schedule-open-event", { detail: event }));
            }
          }}
        >
          <p className="dashboard-upnext-when" style={{ color: accent }}>
            {formatUpNextTileDate(event.scheduled_date)}
            {event.start_time && (
              <span className="dashboard-upnext-when-time">
                {String(event.start_time).slice(0, 5)}–{String(event.end_time || "").slice(0, 5)}
              </span>
            )}
          </p>
          <p className="dashboard-upnext-title">
            <ScheduleEventIcon
              subject={event.subject}
              eventType={event.event_type}
              eventCategory={event.event_category}
              size={13}
            />
            <span>{event.title}</span>
          </p>
        </div>
      ) : !loading ? (
        <span className="dashboard-hero-sub">{emptyText}</span>
      ) : (
        <span className="dashboard-hero-sub">{loadingText}</span>
      )}
    </div>
  );
}

function CombinedUpNextHeroTile({
  personalEvents,
  schedulerEvents,
  loading,
  personalIndex,
  schedulerIndex,
  onPersonalPrevious,
  onPersonalNext,
  onSchedulerPrevious,
  onSchedulerNext,
}: {
  personalEvents: ScheduleEvent[];
  schedulerEvents: ScheduleEvent[];
  loading: boolean;
  personalIndex: number;
  schedulerIndex: number;
  onPersonalPrevious: () => void;
  onPersonalNext: () => void;
  onSchedulerPrevious: () => void;
  onSchedulerNext: () => void;
}) {
  return (
    <div className="dashboard-hero-stat dashboard-hero-stat-combined-upnext">
      <div className="dashboard-upnext-tile-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.85, flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="dashboard-hero-label" style={{ margin: 0 }}>Up Next</span>
      </div>
      <div className="dashboard-combined-upnext-body">
        <UpNextCarouselSection
          heading="Personal"
          events={personalEvents}
          loading={loading}
          index={personalIndex}
          onPrevious={onPersonalPrevious}
          onNext={onPersonalNext}
          emptyText="no upcoming personal events"
          loadingText="loading personal events…"
        />
        <UpNextCarouselSection
          heading="Scheduler"
          events={schedulerEvents}
          loading={loading}
          index={schedulerIndex}
          onPrevious={onSchedulerPrevious}
          onNext={onSchedulerNext}
          emptyText="no upcoming events"
          loadingText="loading next event…"
        />
      </div>
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────────

function ActionCard({ href, icon, title, desc, accent = false }: {
  href: string; icon: ReactNode; title: string; desc: string; accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`dashboard-action-card${accent ? " is-accent" : ""}`}
      style={{
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "1rem 1.1rem",
      borderRadius: "14px",
      border: `1.5px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      background: accent ? "rgb(var(--accent-rgb) / 0.07)" : "var(--surface)",
      textDecoration: "none",
      transition: "border-color 160ms ease, background 160ms ease, transform 120ms ease",
    }}
    >
      <div style={{
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: accent ? "rgb(var(--accent-rgb) / 0.15)" : "var(--field-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: accent ? "var(--accent)" : "var(--muted)",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 0.1rem", fontSize: "0.88rem", fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)" }}>{title}</p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>{desc}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--muted)", opacity: 0.5 }}>
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function PersonalTasksCard({
  tasks,
  onTasksChange,
  onScheduleRefresh,
}: {
  tasks: PersonalTask[];
  onTasksChange: (tasks: PersonalTask[]) => void;
  onScheduleRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    due_date: toISODate(new Date()),
    due_time: "16:00",
    importance: "low" as "low" | "high",
    completed: false,
  });
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [error, setError] = useState("");

  async function refreshTasks() {
    const res = await fetch("/api/tasks?includeCompleted=true", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.tasks)) {
      onTasksChange(data.tasks);
    }
  }

  function openCreateModal() {
    setComposerOpen(true);
    setEditingTask(null);
    setTaskDraft({
      title: "",
      due_date: toISODate(new Date()),
      due_time: "16:00",
      importance: "low",
      completed: false,
    });
    setError("");
  }

  function openEditModal(task: PersonalTask) {
    setComposerOpen(false);
    setEditingTask(task);
    setTaskDraft({
      title: task.title,
      due_date: task.due_date,
      due_time: task.due_time ? String(task.due_time).slice(0, 5) : "16:00",
      importance: task.importance,
      completed: Boolean(task.completed),
    });
    setError("");
  }

  function closeTaskModal() {
    if (saving) return;
    setComposerOpen(false);
    setEditingTask(null);
    setError("");
  }

  async function saveTask() {
    const taskTitle = taskDraft.title.trim();
    if (!taskTitle || !taskDraft.due_date) {
      setError("Add a title and due date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks", {
        method: editingTask ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          dueDate: taskDraft.due_date,
          dueTime: taskDraft.due_time,
          importance: taskDraft.importance,
          completed: taskDraft.completed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || (editingTask ? "Could not update task" : "Could not create task"));
      }
      closeTaskModal();
      await refreshTasks();
      onScheduleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (editingTask ? "Could not update task" : "Could not create task"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted(task: PersonalTask) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not update task");
      }
      await refreshTasks();
      onScheduleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(task: PersonalTask) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not delete task");
      }
      await refreshTasks();
      onScheduleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    } finally {
      setSaving(false);
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    return String(a.due_time || "23:59").localeCompare(String(b.due_time || "23:59"));
  });
  const visibleTasks = sortedTasks.slice(0, 6);

  return (
    <div className="personal-tasks-card">
      <div className="personal-tasks-header">
        <p className="personal-tasks-eyebrow">
          Personal To-Do
        </p>
        <div className="personal-tasks-header-actions">
          <span className="personal-tasks-count">{sortedTasks.filter((t) => !t.completed).length} open</span>
          <button className="button personal-task-add-btn" onClick={openCreateModal}>
            New task
          </button>
        </div>
      </div>

      <div className="personal-tasks-list">
        {sortedTasks.length === 0 ? (
          <p className="personal-tasks-empty">No tasks yet.</p>
        ) : (
          visibleTasks.map((task) => {
            const now = new Date();
            const nowIso = toISODate(now);
            const nowTime = now.toTimeString().slice(0, 5);
            const taskTime = task.due_time ? String(task.due_time).slice(0, 5) : "23:59";
            const isOverdue = !task.completed && (
              task.due_date < nowIso ||
              (task.due_date === nowIso && taskTime < nowTime)
            );
            const dueLabel = new Date(`${task.due_date}T00:00:00`).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            return (
              <button
                key={task.id}
                type="button"
                className={`personal-task-row${task.completed ? " is-completed" : ""}${isOverdue ? " is-overdue" : ""}`}
                onClick={() => openEditModal(task)}
              >
                <div className="personal-task-row-main">
                  <span className={`personal-task-status-dot${task.completed ? " is-completed" : ""}${isOverdue ? " is-overdue" : ""}`} />
                  <div style={{ minWidth: 0 }}>
                    <p className="personal-task-title">{task.title}</p>
                    <p className="personal-task-meta">
                      Due {dueLabel}{task.due_time ? ` at ${String(task.due_time).slice(0, 5)}` : ""} · <span className={`personal-task-priority ${task.importance === "high" ? "is-high" : "is-low"}`}>{task.importance === "high" ? "High" : "Low"} importance</span>
                    </p>
                  </div>
                </div>
                <span className="personal-task-open-indicator">Open</span>
              </button>
            );
          })
        )}
        {sortedTasks.length > visibleTasks.length ? (
          <p className="personal-tasks-more">
            Showing {visibleTasks.length} of {sortedTasks.length} tasks
          </p>
        ) : null}
      </div>

      {(composerOpen || editingTask) ? (
        <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeTaskModal(); }}>
          <div className="scheduler-modal personal-task-modal">
            <button
              type="button"
              className="scheduler-modal-x"
              aria-label="Close"
              onClick={closeTaskModal}
            >
              ×
            </button>
            <div>
              <span className="scheduler-modal-subject-chip">
                {editingTask ? "Update task" : "Create task"}
              </span>
              <h2 className="scheduler-modal-title">
                {editingTask ? taskDraft.title || "Task details" : "New personal task"}
              </h2>
            </div>
            <div className="scheduler-modal-fields">
              <label className="scheduler-modal-field" style={{ gridColumn: "1 / -1" }}>
                <span className="scheduler-modal-label">Title</span>
                <input
                  value={taskDraft.title}
                  onChange={(e) => setTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="scheduler-modal-input"
                  placeholder="Task title"
                />
              </label>
              <label className="scheduler-modal-field">
                <span className="scheduler-modal-label">Due date</span>
                <input
                  type="date"
                  value={taskDraft.due_date}
                  onChange={(e) => setTaskDraft((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="scheduler-modal-input"
                />
              </label>
              <label className="scheduler-modal-field">
                <span className="scheduler-modal-label">Due time</span>
                <input
                  type="time"
                  value={taskDraft.due_time}
                  onChange={(e) => setTaskDraft((prev) => ({ ...prev, due_time: e.target.value }))}
                  className="scheduler-modal-input"
                />
              </label>
              <label className="scheduler-modal-field">
                <span className="scheduler-modal-label">Priority</span>
                <select
                  value={taskDraft.importance}
                  onChange={(e) => setTaskDraft((prev) => ({ ...prev, importance: e.target.value === "high" ? "high" : "low" }))}
                  className="scheduler-modal-input"
                >
                  <option value="low">Low</option>
                  <option value="high">High</option>
                </select>
              </label>
              {editingTask ? (
                <label className="scheduler-modal-field" style={{ justifyContent: "flex-end" }}>
                  <span className="scheduler-modal-label">Completed</span>
                  <input
                    type="checkbox"
                    checked={taskDraft.completed}
                    onChange={(e) => setTaskDraft((prev) => ({ ...prev, completed: e.target.checked }))}
                    style={{ accentColor: "var(--accent)" }}
                  />
                </label>
              ) : null}
            </div>
            {error ? <p className="scheduler-modal-error">{error}</p> : null}
            <div className="scheduler-modal-actions">
              {editingTask ? (
                <button
                  className="scheduler-modal-cancel"
                  onClick={() => { void deleteTask(editingTask); closeTaskModal(); }}
                  disabled={saving}
                >
                  Delete
                </button>
              ) : (
                <button className="scheduler-modal-cancel" onClick={closeTaskModal} disabled={saving}>
                  Cancel
                </button>
              )}
              {editingTask ? (
                <button
                  className="scheduler-modal-cancel"
                  onClick={() => { void toggleCompleted(editingTask); closeTaskModal(); }}
                  disabled={saving}
                >
                  {editingTask.completed ? "Mark open" : "Mark done"}
                </button>
              ) : null}
              <button className="scheduler-modal-confirm" onClick={() => { void saveTask(); }} disabled={saving}>
                {saving ? "Saving…" : editingTask ? "Save changes" : "Create task"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [upNextScheduleEvents, setUpNextScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayDate(new Date()));
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [activeTerm, setActiveTerm] = useState<DashboardSummaryPayload["activeTerm"]>(null);
  const [loading, setLoading] = useState(true);
  const [initialBootLoading, setInitialBootLoading] = useState(true);
  const [bootSteps, setBootSteps] = useState<DashboardBootStep[]>([
    { id: "settings", label: "Fetching settings", status: "pending" },
    { id: "lessons", label: "Fetching lesson packs", status: "pending" },
    { id: "schedule", label: "Fetching timetable", status: "pending" },
    { id: "tasks", label: "Fetching tasks", status: "pending" },
  ]);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [personalUpNextIndex, setPersonalUpNextIndex] = useState(0);
  const [upNextIndex, setUpNextIndex] = useState(0);
  const [schedulerViewMode, setSchedulerViewMode] = useState<"week" | "day" | "month" | "term">("week");

  const updateBootStep = useCallback((id: DashboardBootStep["id"], status: DashboardBootStep["status"]) => {
    setBootSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status } : step)));
  }, []);

  const refreshTasksFromApi = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/tasks?includeCompleted=true", signal ? { signal, cache: "no-store" } : { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!(signal?.aborted) && res.ok && Array.isArray(data?.tasks)) {
        setTasks(data.tasks);
        return data.tasks as PersonalTask[];
      }
    } catch {
      // Keep existing task state if task refresh fails.
    }
    return null;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setInitialBootLoading(true);
    setBootSteps([
      { id: "settings", label: "Fetching settings", status: "active" },
      { id: "lessons", label: "Fetching lesson packs", status: "pending" },
      { id: "schedule", label: "Fetching timetable", status: "pending" },
      { id: "tasks", label: "Fetching tasks", status: "pending" },
    ]);

    void (async () => {
      try {
        const res = await fetch("/api/dashboard/summary", { cache: "no-store", signal: controller.signal });
        if (res.ok) {
          const data = (await res.json()) as DashboardSummaryPayload;
          setItems(normaliseLibraryItems(data?.libraryItems));
          updateBootStep("settings", "done");
          updateBootStep("lessons", "active");
          updateBootStep("lessons", "done");
          updateBootStep("schedule", "active");
          setScheduleEvents(Array.isArray(data?.scheduleEvents) ? data.scheduleEvents : []);
          setUpNextScheduleEvents(Array.isArray(data?.upNextEvents) ? data.upNextEvents : []);
          setEmail(String(data?.email ?? ""));
          setDisplayName(data?.profileSetup?.displayName ?? "");
          setAvatarUrl(data?.profileSetup?.avatarUrl ?? "");
          setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
          setActiveTerm(data?.activeTerm ?? null);
          updateBootStep("schedule", "done");
          updateBootStep("tasks", "active");
          if (typeof window !== "undefined") {
            sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
          }
          await refreshTasksFromApi(controller.signal);
          if (!controller.signal.aborted) {
            updateBootStep("tasks", "done");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setScheduleLoading(false);
          setLoading(false);
          setInitialBootLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [refreshTasksFromApi, updateBootStep]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshTasksFromApi(controller.signal);
    return () => controller.abort();
  }, [refreshTasksFromApi]);

  const handleScheduleMutation = useCallback(() => {
    setScheduleRefreshKey((k) => k + 1);
    void refreshTasksFromApi();
  }, [refreshTasksFromApi]);

  const handleTaskCrudRefresh = useCallback(() => {
    setScheduleRefreshKey((k) => k + 1);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pa:schedule-refresh"));
    }
  }, []);

  useEffect(() => {
    const selectedWeekIso = toISODate(weekStart);
    const currentWeekIso = getMondayISO();
    if (scheduleRefreshKey === 0 && selectedWeekIso === currentWeekIso) return;
    const controller = new AbortController();
    const todayIso = toISODate(new Date());
    const upNextRangeEnd = new Date();
    upNextRangeEnd.setDate(upNextRangeEnd.getDate() + 30);
    const upNextRangeEndIso = toISODate(upNextRangeEnd);
    const timer = window.setTimeout(() => {
      void (async () => {
        setScheduleLoading(true);
        try {
          const [weekRes, upNextRes] = await Promise.all([
            fetch(`/api/schedule?weekStart=${selectedWeekIso}`, { signal: controller.signal, cache: "no-store" }),
            fetch(`/api/schedule?from=${todayIso}&to=${upNextRangeEndIso}`, { signal: controller.signal, cache: "no-store" }),
          ]);
          const weekData = await weekRes.json().catch(() => ({}));
          const upNextData = await upNextRes.json().catch(() => ({}));
          if (weekRes.ok) {
            setScheduleEvents(Array.isArray(weekData?.events) ? weekData.events : []);
          }
          if (upNextRes.ok) {
            setUpNextScheduleEvents(Array.isArray(upNextData?.events) ? upNextData.events : []);
          }
        } finally {
          if (!controller.signal.aborted) {
            setScheduleLoading(false);
          }
        }
      })();
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [scheduleRefreshKey, weekStart]);

  const recent = items.slice(0, 5);
  const emailPrefix = email.split("@")[0] ?? "";
  const nameForInitials = displayName || emailPrefix || "PrimaryAI";
  const greetingLine = displayName ? `${greeting()}, ${displayName}` : greeting();
  const initials = nameForInitials
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "PA";

  // Hero strip stats
  const upNextEvents = useMemo(() => {
    const now = new Date();
    const nowDate = toISODate(now);
    const nowTime = now.toTimeString().slice(0, 5);
    return upNextScheduleEvents
      .filter((event) => {
        const eventDate = String(event.scheduled_date || "");
        const eventTime = String(event.start_time || "").slice(0, 5);
        return eventDate > nowDate || (eventDate === nowDate && eventTime >= nowTime);
      })
      .sort((a, b) =>
        a.scheduled_date !== b.scheduled_date
          ? a.scheduled_date.localeCompare(b.scheduled_date)
          : a.start_time.localeCompare(b.start_time),
      )
      .slice(0, 8);
  }, [upNextScheduleEvents]);
  const personalUpNextEvents = useMemo(
    () => upNextEvents.filter((event) => isPersonalScheduleEvent(event)),
    [upNextEvents],
  );
  const schedulerUpNextEvents = useMemo(
    () => upNextEvents.filter((event) => !isPersonalScheduleEvent(event)),
    [upNextEvents],
  );

  useEffect(() => {
    if (schedulerUpNextEvents.length === 0) {
      setUpNextIndex(0);
      return;
    }
    setUpNextIndex((current) => Math.min(current, schedulerUpNextEvents.length - 1));
  }, [schedulerUpNextEvents]);

  useEffect(() => {
    if (personalUpNextEvents.length === 0) {
      setPersonalUpNextIndex(0);
      return;
    }
    setPersonalUpNextIndex((current) => Math.min(current, personalUpNextEvents.length - 1));
  }, [personalUpNextEvents]);

  const termCountdown = useMemo(() => {
    if (!activeTerm?.termStartDate || !activeTerm?.termEndDate) {
      return { hasTerm: false, progress: 0, totalDays: 0, elapsedDays: 0 };
    }
    const [startYear, startMonth, startDay] = activeTerm.termStartDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = activeTerm.termEndDate.split("-").map(Number);
    const start = new Date(startYear, (startMonth || 1) - 1, startDay || 1);
    const end = new Date(endYear, (endMonth || 1) - 1, endDay || 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
    const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((today.getTime() - start.getTime()) / msPerDay) + 1));
    const progress = Math.min(1, Math.max(0, elapsedDays / totalDays));
    return { hasTerm: true, progress, totalDays, elapsedDays };
  }, [activeTerm]);

  // Insight card computation
  const insightData = useMemo(() => {
    if (items.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.subject] = (counts[item.subject] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topEntry = sorted[0];
    const covered = new Set(Object.keys(counts));
    const ALL_SUBJECTS = ["Maths", "English", "Science", "History", "Geography", "Computing", "Music", "Art", "PE", "PSHE", "RE"];
    const missing = ALL_SUBJECTS.filter((s) => !covered.has(s));
    const topPct = topEntry ? Math.round((topEntry[1] / items.length) * 100) : 0;
    const toMinutes = (time: string) => {
      const [h, m] = String(time || "").split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const monday = getMondayDate(new Date());
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    const weekEvents = scheduleEvents.filter((event) => {
      const [year, month, day] = String(event.scheduled_date || "").split("-").map(Number);
      if (!year || !month || !day) return false;
      const eventDate = new Date(year, month - 1, day);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= monday && eventDate <= friday;
    });
    const scheduledHourEvents = weekEvents.filter(
      (event) =>
        !isImportedCalendarScheduleEvent(event) &&
        !isTaskScheduleEvent(event) &&
        !isPersonalScheduleEvent(event),
    );
    const clashEligibleEvents = scheduledHourEvents.filter(
      (event) => !isImportedCalendarScheduleEvent(event) && !isTaskScheduleEvent(event),
    );
    const eventsByDay = new Map<string, ScheduleEvent[]>();
    let totalScheduledMinutes = 0;
    let clashCount = 0;

    for (const event of scheduledHourEvents) {
      const dayEvents = eventsByDay.get(event.scheduled_date) ?? [];
      dayEvents.push(event);
      eventsByDay.set(event.scheduled_date, dayEvents);
      totalScheduledMinutes += Math.max(0, toMinutes(event.end_time) - toMinutes(event.start_time));
    }

    const clashEventsByDay = new Map<string, ScheduleEvent[]>();
    for (const event of clashEligibleEvents) {
      const dayEvents = clashEventsByDay.get(event.scheduled_date) ?? [];
      dayEvents.push(event);
      clashEventsByDay.set(event.scheduled_date, dayEvents);
    }

    for (const [, dayEvents] of clashEventsByDay) {
      const sortedEvents = [...dayEvents].sort((a, b) => a.start_time.localeCompare(b.start_time));
      let activeEnd = -1;
      let clashWindowOpen = false;
      for (const event of sortedEvents) {
        const eventStart = toMinutes(event.start_time);
        const eventEnd = toMinutes(event.end_time);
        if (activeEnd >= 0 && eventStart < activeEnd) {
          if (!clashWindowOpen) {
            clashCount += 1;
            clashWindowOpen = true;
          }
          activeEnd = Math.max(activeEnd, eventEnd);
        } else {
          activeEnd = eventEnd;
          clashWindowOpen = false;
        }
      }
    }

    const weekdaysInView = 5;
    const scheduledDayCount = eventsByDay.size;
    const freeDayCount = Math.max(0, weekdaysInView - scheduledDayCount);
    const totalHours = Math.round((totalScheduledMinutes / 60) * 10) / 10;

    return {
      topSubject: topEntry?.[0],
      topPct,
      missing,
      coveredCount: covered.size,
      scheduledDayCount,
      freeDayCount,
      totalHours,
      clashCount,
    };
  }, [items, scheduleEvents]);

  if (initialBootLoading) {
    return <DashboardBootSplash steps={bootSteps} />;
  }

  return (
    <main className="page-wrap">
      {/* Greeting header */}
      <div style={{ padding: "0.2rem 0 0.35rem", marginBottom: "0.65rem" }}>
        <div className="dashboard-greeting-row" style={{ display: "flex", alignItems: "center", gap: "0.7rem", margin: "0 0 0.2rem" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "999px",
                objectFit: "cover",
                border: "1px solid #fff",
                boxShadow: "0 0 0 3px #22c55e, 0 0 0 4px #000",
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "999px",
              border: "1px solid #fff",
              boxShadow: "0 0 0 3px #22c55e, 0 0 0 4px #000",
              background: "var(--field-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              fontSize: "1.05rem",
              fontWeight: 300,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: "clamp(1.45rem, 5vw, 2rem)",
              fontWeight: 280,
              letterSpacing: "-0.05em",
              color: "var(--accent)",
              lineHeight: 1,
            }}>
              {greetingLine}
            </h1>
            {activeTerm?.termName && activeTerm?.termStartDate && activeTerm?.termEndDate ? (
              <p style={{ margin: "0.28rem 0 0", paddingLeft: "0.3rem", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.45 }}>
                Active term: {activeTerm.termName} · {formatShortUkDate(activeTerm.termStartDate)} to {formatShortUkDate(activeTerm.termEndDate)} · {Math.max(0, Number(activeTerm.daysRemaining || 0))} days remaining
              </p>
            ) : (
              <p style={{ margin: "0.28rem 0 0", paddingLeft: "0.5rem", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.45 }}>
                <Link href="/settings" style={{ color: "inherit", textDecoration: "underline" }}>
                  No active term set, please update in settings
                </Link>
              </p>
            )}
          </div>
          <button
            type="button"
            className="dashboard-cmdpal-btn dashboard-cmdpal-btn-header"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "k", bubbles: true }))}
            aria-label="Open command palette"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Search
            <kbd style={{ fontSize: "0.64rem", padding: "0.1rem 0.35rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--btn-bg)", lineHeight: 1 }}>⌘K</kbd>
          </button>
          <DashboardClock />
        </div>
        <div className="dashboard-greeting-actions" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.2rem" }}>
          <div style={{ paddingLeft: "60px", minWidth: 0 }}>
            {(!displayName && email) ? (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                {email}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`dashboard-top-grid${schedulerViewMode === "term" ? " is-term-view" : ""}`} style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            borderRadius: "16px",
            border: "1px solid var(--border-card)",
            background: "var(--surface)",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <SchedulerDrawer
            embedded
            open
            onClose={() => {}}
            onScheduleChange={handleScheduleMutation}
            onViewModeStateChange={setSchedulerViewMode}
            initialPacks={items.map((item) => ({
              id: item.id,
              title: item.title,
              subject: item.subject,
              yearGroup: item.yearGroup,
              topic: item.topic,
            }))}
            initialWeekEvents={scheduleEvents}
          />
        </div>

        <div className={`dashboard-hero-side-wrap${schedulerViewMode === "term" ? " is-below-term" : ""}`}>
          <div className="dashboard-header-actions">
            <div aria-hidden="true" />
          </div>
          <div className="dashboard-hero dashboard-hero-side">
            <div className="dashboard-hero-stat term-countdown-stat">
              {!loading && activeTerm?.termEndDate ? (
                <TermCountdownRing
                  termName={activeTerm.termName || "Term"}
                  termStartDate={activeTerm.termStartDate}
                  termEndDate={activeTerm.termEndDate}
                />
              ) : !loading ? (
                <>
                  <span className="dashboard-hero-label">End of Term</span>
                  <span className="dashboard-hero-sub">set term dates in settings</span>
                </>
              ) : (
                <span className="dashboard-hero-value">–</span>
              )}
            </div>
            <CombinedUpNextHeroTile
              personalEvents={personalUpNextEvents}
              schedulerEvents={schedulerUpNextEvents}
              loading={scheduleLoading}
              personalIndex={personalUpNextIndex}
              schedulerIndex={upNextIndex}
              onPersonalPrevious={() => setPersonalUpNextIndex((current) => Math.max(0, current - 1))}
              onPersonalNext={() => setPersonalUpNextIndex((current) => Math.min(personalUpNextEvents.length - 1, current + 1))}
              onSchedulerPrevious={() => setUpNextIndex((current) => Math.max(0, current - 1))}
              onSchedulerNext={() => setUpNextIndex((current) => Math.min(schedulerUpNextEvents.length - 1, current + 1))}
            />
            <ActivityBySubjectCard
              scheduleEvents={scheduleEvents}
              loading={scheduleLoading}
              weekStart={weekStart}
            />
            <div className="dashboard-hero-stat dashboard-hero-stat-insight">
              <div className="dashboard-hero-badge-wrap dashboard-hero-badge-wrap-plain">
                <svg className="dashboard-hero-stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" fill="currentColor" opacity="0.22" />
                  <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
                  <path d="M6 14l.7 1.6L8.3 16l-1.6.7L6 18.3l-.7-1.6L3.7 16l1.6-.7L6 14z" />
                </svg>
                <span className="dashboard-hero-label" style={{ margin: 0 }}>Insight</span>
              </div>
              <span className="dashboard-hero-insight-text">
                {loading || !insightData
                  ? "No insight yet."
                  : insightData.clashCount > 0
                    ? `You have ${insightData.clashCount} ${insightData.clashCount === 1 ? "clashing appointment" : "clashing appointments"} this week across ${insightData.scheduledDayCount} scheduled ${insightData.scheduledDayCount === 1 ? "day" : "days"}. Diary space is tight, so it would be worth resolving overlaps before adding more.`
                    : insightData.freeDayCount >= 2
                      ? `Your diary still has ${insightData.freeDayCount} relatively open ${insightData.freeDayCount === 1 ? "day" : "days"} this week, with around ${insightData.totalHours} scheduled ${insightData.totalHours === 1 ? "hour" : "hours"} in place. ${insightData.missing.length > 0 ? `You could use that space to strengthen ${insightData.missing.slice(0, 2).join(" or ")} coverage.` : `Coverage is broad, with ${insightData.topSubject} currently leading at ${insightData.topPct}% of your packs.`}`
                      : insightData.missing.length > 0
                        ? `This is a busy week with ${insightData.totalHours} scheduled hours across ${insightData.scheduledDayCount} days. Your strongest library coverage is ${insightData.topSubject}, but ${insightData.missing.slice(0, 2).join(" and ")} still look like good opportunities for the next packs you generate.`
                        : `This week looks well used with ${insightData.totalHours} scheduled hours across ${insightData.scheduledDayCount} days and no current clashes. Your library coverage is broad, with ${insightData.topSubject} currently strongest at ${insightData.topPct}% of saved packs.`}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
          <PersonalTasksCard
            tasks={tasks}
            onTasksChange={setTasks}
            onScheduleRefresh={handleTaskCrudRefresh}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <ActionCard
              href="/library"
              title="Lesson Library"
              desc="Browse and manage your saved packs"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              }
            />

            <ActionCard
              href="/settings"
              title="Teacher Settings"
              desc="Defaults, tone, school type and preferences"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              }
            />
          </div>
            <LibraryOverview items={items} loading={loading} />

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.25rem" }}>
            <ActionCard
              href="/account"
              title="Account"
              desc="Manage your profile and sign-in details"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                </svg>
              }
            />

            <ActionCard
              href="/billing"
              title="Billing"
              desc="Manage your subscription and plan"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              }
            />
          </div>

          {/* Recent packs */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
                Recent lesson packs
              </p>
              <Link href="/library" style={{ fontSize: "0.76rem", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                View all →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                  height: "72px", borderRadius: "14px", background: "var(--surface)",
                  border: "1px solid var(--border-card)", animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }} />
              ))}

              {!loading && recent.length === 0 && (
                <div style={{ padding: "2.5rem 1.5rem", borderRadius: "16px", border: "1.5px dashed var(--border)", textAlign: "center" as const }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", margin: "0 auto 0.75rem", display: "block" }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <p style={{ margin: "0 0 0.85rem", fontSize: "0.85rem", color: "var(--muted)" }}>No saved lesson packs yet.</p>
                  <Link href="/lesson-pack" className="nav-btn-cta" style={{ fontSize: "0.82rem", padding: "0.5rem 1.1rem", borderRadius: "10px", textDecoration: "none" }}>
                    Generate your first pack
                  </Link>
                </div>
              )}

              {!loading && recent.map((item) => {
                return (
                  <Link key={item.id} href="/library" style={{ textDecoration: "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                  >
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.85rem 1rem",
                      borderRadius: "14px", border: "1px solid var(--border-card)", background: "var(--surface)",
                      transition: "border-color 150ms ease, transform 120ms ease",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: subjectColor(item.subject) }}>
                        <ScheduleEventIcon subject={item.subject} size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 0.2rem", fontSize: "0.87rem", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.topic}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" as const }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.08rem 0.45rem", borderRadius: "999px", background: `color-mix(in srgb, ${subjectColor(item.subject)} 12%, transparent)`, color: subjectColor(item.subject) }}>{item.yearGroup}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{item.subject}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0, textAlign: "right" as const }}>{relativeTime(item.createdAt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      </div>

    </main>
  );
}
