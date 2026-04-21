"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { subjectColor } from "@/lib/subjectColor";
import { ScheduleEventIcon } from "@/lib/schedule-event-icon";
import { TermCountdownRing } from "@/components/dashboard/TermCountdownRing";
import NotesWidget from "@/components/dashboard/NotesWidget";

const SchedulerDrawer = dynamic(() => import("@/components/dashboard/SchedulerDrawer"), {
  ssr: false,
});

const AiSchedulePanel = dynamic(() => import("@/components/dashboard/AiSchedulePanel"), {
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
  linked_document_id?: string | null;
  linked_document_name?: string | null;
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
  priority?: "p1" | "p2" | "p3" | "p4" | null;
  label?: "planning" | "marking" | "admin" | "personal" | "send" | null;
  snoozed_until?: string | null;
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

function formatShortUkDate(iso: string) {
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

const DASHBOARD_CACHE_KEY = "pa_dashboard_summary_v2";
const DASHBOARD_CALENDAR_REFRESH_KEY = "pa_dashboard_calendar_refresh_v1";

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

function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pa:open-command-palette"));
  }
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

type WorkloadSuggestion = {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  date?: string;
  actionLabel?: string;
  actionHref?: string;
};

type WellbeingSummary = {
  thisWeek: {
    scheduledMins: number;
    workCapacityMins: number;
    eveningsProtected: number;
    lunchesProtected: number;
    overloadDays: number;
    trend: "improving" | "stable" | "worsening";
  };
  allTime: {
    eveningsProtected: number;
    eveningsTotal: number;
    lunchesProtected: number;
    lunchesTotal: number;
    weeksAnalysed: number;
  };
};

const MOOD_EMOJIS = ["😫", "😟", "😐", "🙂", "😊"] as const;
const MOOD_LABELS = ["Exhausted", "Struggling", "Okay", "Good", "Great"] as const;
const MOOD_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981"] as const;

function WellbeingSummaryCard() {
  const [summary, setSummary] = useState<WellbeingSummary | null>(null);
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [savingMood, setSavingMood] = useState(false);

  const loadSummary = useCallback(() => {
    fetch("/api/wellbeing/summary?weeks=6", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({}))
      .then((d) => { if (d?.summary) setSummary(d.summary); });
  }, []);

  useEffect(() => {
    loadSummary();
    fetch("/api/wellbeing/checkin?days=1", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({}))
      .then((d) => { if (d?.today?.mood) setTodayMood(d.today.mood); });
    window.addEventListener("pa:schedule-refresh", loadSummary);
    return () => window.removeEventListener("pa:schedule-refresh", loadSummary);
  }, [loadSummary]);

  async function saveMood(mood: number) {
    if (savingMood) return;
    setSavingMood(true);
    setTodayMood(mood);
    await fetch("/api/wellbeing/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood }),
    }).catch(() => null);
    setSavingMood(false);
  }

  if (!summary) return null;

  const { thisWeek, allTime } = summary;
  const workloadPct = thisWeek.workCapacityMins > 0
    ? Math.round((thisWeek.scheduledMins / thisWeek.workCapacityMins) * 100)
    : 0;

  const trendArrow = thisWeek.trend === "improving" ? "↓" : thisWeek.trend === "worsening" ? "↑" : "→";
  const trendColor = thisWeek.trend === "improving" ? "#22c55e" : thisWeek.trend === "worsening" ? "#ef4444" : "#94a3b8";
  const trendLabel = thisWeek.trend === "improving" ? "Lighter than last week" : thisWeek.trend === "worsening" ? "Heavier than last week" : "Similar to last week";

  const workloadColor = workloadPct > 110 ? "#ef4444" : workloadPct > 90 ? "#f59e0b" : "#22c55e";
  const eveningPct = allTime.eveningsTotal > 0 ? Math.round((allTime.eveningsProtected / allTime.eveningsTotal) * 100) : 100;

  const stats = [
    { value: `${workloadPct}%`, label: "Weekly capacity", color: workloadColor },
    { value: `${thisWeek.eveningsProtected}/5`, label: "Evenings free", color: "#16a34a" },
    { value: `${eveningPct}%`, label: `${allTime.weeksAnalysed}-week average`, color: "#2563eb" },
  ];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", marginBottom: "0.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", borderBottom: "1px solid var(--border)" }}>
        <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
          Wellbeing
        </p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", color: trendColor, fontWeight: 600 }}>
          <span>{trendArrow}</span>
          <span>{trendLabel}</span>
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {stats.map(({ value, label, color }, i) => (
          <div
            key={label}
            style={{
              padding: "0.85rem 0.75rem",
              textAlign: "center",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <p style={{ margin: "0 0 0.2rem", fontSize: "1.5rem", fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
            <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted)", fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Overload warning */}
      {thisWeek.overloadDays > 0 && (
        <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, #f97316 6%, var(--surface))" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#f97316", fontWeight: 600 }}>
            ⚠ {thisWeek.overloadDays} day{thisWeek.overloadDays > 1 ? "s" : ""} over capacity — consider rescheduling.
          </p>
        </div>
      )}

      {/* Mood check-in */}
      <div style={{ padding: "0.75rem 1rem" }}>
        <p style={{ margin: "0 0 0.55rem", fontSize: "0.7rem", fontWeight: 600, color: todayMood ? MOOD_COLORS[todayMood - 1] : "var(--muted)" }}>
          {todayMood ? `${MOOD_EMOJIS[todayMood - 1]}  ${MOOD_LABELS[todayMood - 1]} today` : "How are you feeling today?"}
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {MOOD_EMOJIS.map((emoji, i) => {
            const mood = i + 1;
            const selected = todayMood === mood;
            const color = MOOD_COLORS[i];
            return (
              <button
                key={mood}
                type="button"
                onClick={() => void saveMood(mood)}
                title={MOOD_LABELS[i]}
                style={{
                  flex: 1,
                  fontSize: "1.25rem",
                  lineHeight: 1,
                  padding: "0.45rem 0",
                  borderRadius: "10px",
                  border: `1.5px solid ${selected ? color : "var(--border)"}`,
                  background: selected ? `color-mix(in srgb, ${color} 14%, var(--bg))` : "transparent",
                  cursor: "pointer",
                  transition: "border-color 120ms, background 120ms, transform 100ms",
                  transform: selected ? "scale(1.1)" : "scale(1)",
                  fontFamily: "inherit",
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkloadSuggestionsStrip() {
  const [suggestions, setSuggestions] = useState<WorkloadSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(sessionStorage.getItem("pa:dismissed-suggestions") || "[]")); } catch { return new Set(); }
  });

  const loadSuggestions = useCallback(() => {
    fetch("/api/workload/suggestions", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({}))
      .then((data) => {
        if (Array.isArray(data?.suggestions)) setSuggestions(data.suggestions);
      });
  }, []);

  useEffect(() => {
    loadSuggestions();
    window.addEventListener("pa:schedule-refresh", loadSuggestions);
    return () => window.removeEventListener("pa:schedule-refresh", loadSuggestions);
  }, [loadSuggestions]);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pa:dismissed-suggestions", JSON.stringify([...next]));
      }
      return next;
    });
  }

  const visible = suggestions.filter((s) => !dismissed.has(s.id)).slice(0, 4);
  if (visible.length === 0) return null;

  const SEVERITY_COLORS = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.25rem" }}>
      <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
        Workload Insights
      </p>
      {visible.map((s) => {
        const color = SEVERITY_COLORS[s.severity];
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              padding: "0.65rem 0.8rem",
              borderRadius: "12px",
              border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
              background: `color-mix(in srgb, ${color} 5%, var(--surface))`,
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "4px" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{s.title}</p>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.45 }}>{s.body}</p>
              {s.actionHref && s.actionLabel && (
                <Link href={s.actionHref} style={{ display: "inline-block", marginTop: "0.35rem", fontSize: "0.73rem", fontWeight: 600, color, textDecoration: "none" }}>
                  {s.actionLabel} →
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(s.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px", fontSize: "0.9rem", lineHeight: 1, flexShrink: 0 }}
              aria-label="Dismiss"
            >×</button>
          </div>
        );
      })}
    </div>
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
  const [activeTab, setActiveTab] = useState<"today" | "week" | "later" | "trash">("today");
  const [deletedTasks, setDeletedTasks] = useState<(PersonalTask & { deleted_at: string })[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    due_date: toISODate(new Date()),
    due_time: "16:00",
    importance: "low" as "low" | "high",
    priority: null as "p1" | "p2" | "p3" | "p4" | null,
    label: null as "planning" | "marking" | "admin" | "personal" | "send" | null,
    snoozed_until: null as string | null,
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

  async function loadDeletedTasks() {
    setDeletedLoading(true);
    const res = await fetch("/api/tasks/deleted", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.tasks)) {
      setDeletedTasks(data.tasks);
    }
    setDeletedLoading(false);
  }

  async function restoreTask(id: string) {
    setSaving(true);
    await fetch(`/api/tasks/${id}/restore`, { method: "POST" });
    await Promise.all([refreshTasks(), loadDeletedTasks()]);
    setSaving(false);
    onScheduleRefresh();
  }

  async function emptyTrash() {
    setSaving(true);
    await fetch("/api/tasks/deleted", { method: "DELETE" });
    setDeletedTasks([]);
    setSaving(false);
  }

  function openCreateModal() {
    setComposerOpen(true);
    setEditingTask(null);
    setTaskDraft({
      title: "",
      due_date: toISODate(new Date()),
      due_time: "16:00",
      importance: "low",
      priority: null,
      label: null,
      snoozed_until: null,
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
      priority: task.priority ?? null,
      label: task.label ?? null,
      snoozed_until: task.snoozed_until ?? null,
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
          priority: taskDraft.priority,
          label: taskDraft.label,
          snoozedUntil: taskDraft.snoozed_until,
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

  const PRIORITY_COLORS: Record<string, string> = { p1: "#ef4444", p2: "#f97316", p3: "#3b82f6", p4: "#6b7280" };
  const LABEL_COLORS: Record<string, string> = { planning: "#8b5cf6", marking: "#f59e0b", admin: "#6b7280", personal: "#10b981", send: "#3b82f6" };

  const now = new Date();
  const todayIso = toISODate(now);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay() || 7));
  const endOfWeekIso = toISODate(endOfWeek);

  const activeTasks = tasks.filter((t) => {
    if (t.completed) return false;
    if (t.snoozed_until && t.snoozed_until > todayIso) return false;
    return true;
  });

  const tabTasks = activeTasks.filter((t) => {
    if (activeTab === "today") return t.due_date <= todayIso;
    if (activeTab === "week") return t.due_date > todayIso && t.due_date <= endOfWeekIso;
    return t.due_date > endOfWeekIso;
  });

  const priorityOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3, null: 4, undefined: 4 };
  const sortedTabTasks = [...tabTasks].sort((a, b) => {
    const pa = priorityOrder[String(a.priority ?? "null")] ?? 4;
    const pb = priorityOrder[String(b.priority ?? "null")] ?? 4;
    if (pa !== pb) return pa - pb;
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    return String(a.due_time || "23:59").localeCompare(String(b.due_time || "23:59"));
  });

  const tabCounts = {
    today: activeTasks.filter((t) => t.due_date <= todayIso).length,
    week: activeTasks.filter((t) => t.due_date > todayIso && t.due_date <= endOfWeekIso).length,
    later: activeTasks.filter((t) => t.due_date > endOfWeekIso).length,
  };

  return (
    <div className="personal-tasks-card">
      <div className="personal-tasks-header">
        <p className="personal-tasks-eyebrow">
          Personal To-Do
        </p>
        <div className="personal-tasks-header-actions">
          <span className="personal-tasks-count">{activeTasks.length} open</span>
          <button className="button personal-task-add-btn" onClick={openCreateModal}>
            New task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.15rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {(["today", "week", "later", "trash"] as const).map((tab) => {
          const labels = { today: "Today", week: "This Week", later: "Later", trash: "Trash" };
          const active = activeTab === tab;
          const count = tab === "trash" ? deletedTasks.length : tabCounts[tab as keyof typeof tabCounts];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                if (tab === "trash") loadDeletedTasks();
              }}
              style={{
                padding: "0.28rem 0.7rem",
                borderRadius: "7px",
                border: "none",
                background: active ? (tab === "trash" ? "rgb(239 68 68 / 0.1)" : "rgb(var(--accent-rgb) / 0.12)") : "transparent",
                color: active ? (tab === "trash" ? "#ef4444" : "var(--accent)") : "var(--muted)",
                fontSize: "0.78rem",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {labels[tab]}
              {(count ?? 0) > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: "16px", height: "16px", borderRadius: "99px",
                  background: active ? (tab === "trash" ? "#ef4444" : "var(--accent)") : "var(--border)",
                  color: active ? "white" : "var(--muted)",
                  fontSize: "0.68rem", fontWeight: 700, padding: "0 4px",
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "trash" ? (
        <div>
          {deletedLoading ? (
            <p className="personal-tasks-empty">Loading…</p>
          ) : deletedTasks.length === 0 ? (
            <p className="personal-tasks-empty">Trash is empty.</p>
          ) : (
            <>
              <div className="personal-tasks-list">
                {deletedTasks.map((task) => {
                  const deletedLabel = new Date(task.deleted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  return (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--border)", opacity: 0.75 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                        <p style={{ margin: 0, fontSize: "0.73rem", color: "var(--muted)" }}>Due {task.due_date} · Deleted {deletedLabel}</p>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => restoreTask(task.id)}
                        style={{ padding: "0.22rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        Restore
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={emptyTrash}
                style={{ marginTop: "0.75rem", width: "100%", padding: "0.35rem", borderRadius: "7px", border: "1px solid #fca5a5", background: "transparent", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Empty trash
              </button>
            </>
          )}
        </div>
      ) : (
      <div className="personal-tasks-list">
        {sortedTabTasks.length === 0 ? (
          <p className="personal-tasks-empty">
            {activeTab === "today" ? "Nothing due today." : activeTab === "week" ? "Nothing due this week." : "No tasks later."}
          </p>
        ) : (
          sortedTabTasks.map((task) => {
            const taskTime = task.due_time ? String(task.due_time).slice(0, 5) : "23:59";
            const nowTime = now.toTimeString().slice(0, 5);
            const isOverdue = task.due_date < todayIso || (task.due_date === todayIso && taskTime < nowTime);
            const dueLabel = new Date(`${task.due_date}T00:00:00`).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : null;
            const labelColor = task.label ? LABEL_COLORS[task.label] : null;
            return (
              <button
                key={task.id}
                type="button"
                className={`personal-task-row${isOverdue ? " is-overdue" : ""}`}
                onClick={() => openEditModal(task)}
              >
                <div className="personal-task-row-main">
                  <span className={`personal-task-status-dot${isOverdue ? " is-overdue" : ""}`} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="personal-task-title">{task.title}</p>
                    <p className="personal-task-meta" style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                      <span>Due {dueLabel}{task.due_time ? ` at ${String(task.due_time).slice(0, 5)}` : ""}</span>
                      {task.priority && (
                        <span style={{ padding: "1px 5px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 700, background: `color-mix(in srgb, ${priorityColor} 15%, transparent)`, color: priorityColor!, border: `1px solid color-mix(in srgb, ${priorityColor} 35%, transparent)` }}>
                          {task.priority.toUpperCase()}
                        </span>
                      )}
                      {task.label && (
                        <span style={{ padding: "1px 5px", borderRadius: "5px", fontSize: "0.68rem", fontWeight: 600, background: `color-mix(in srgb, ${labelColor} 12%, transparent)`, color: labelColor!, border: `1px solid color-mix(in srgb, ${labelColor} 30%, transparent)`, textTransform: "capitalize" }}>
                          {task.label}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="personal-task-open-indicator">Open</span>
              </button>
            );
          })
        )}
      </div>
      )}

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
              <div className="scheduler-modal-field" style={{ gridColumn: "1 / -1" }}>
                <span className="scheduler-modal-label">Priority</span>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {(["p1","p2","p3","p4"] as const).map((p) => {
                    const sel = taskDraft.priority === p;
                    const pc = PRIORITY_COLORS[p];
                    return (
                      <button key={p} type="button"
                        onClick={() => setTaskDraft((prev) => ({ ...prev, priority: sel ? null : p }))}
                        style={{ padding: "0.25rem 0.65rem", borderRadius: "7px", border: `1.5px solid ${sel ? pc : "var(--border)"}`, background: sel ? `color-mix(in srgb, ${pc} 15%, transparent)` : "transparent", color: sel ? pc : "var(--muted)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >{p.toUpperCase()}</button>
                    );
                  })}
                </div>
              </div>
              <div className="scheduler-modal-field" style={{ gridColumn: "1 / -1" }}>
                <span className="scheduler-modal-label">Label</span>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {(["planning","marking","admin","personal","send"] as const).map((lbl) => {
                    const sel = taskDraft.label === lbl;
                    const lc = LABEL_COLORS[lbl];
                    return (
                      <button key={lbl} type="button"
                        onClick={() => setTaskDraft((prev) => ({ ...prev, label: sel ? null : lbl }))}
                        style={{ padding: "0.25rem 0.65rem", borderRadius: "7px", border: `1.5px solid ${sel ? lc : "var(--border)"}`, background: sel ? `color-mix(in srgb, ${lc} 12%, transparent)` : "transparent", color: sel ? lc : "var(--muted)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}
                      >{lbl}</button>
                    );
                  })}
                </div>
              </div>
              <label className="scheduler-modal-field">
                <span className="scheduler-modal-label">Snooze until</span>
                <input
                  type="date"
                  value={taskDraft.snoozed_until ?? ""}
                  onChange={(e) => setTaskDraft((prev) => ({ ...prev, snoozed_until: e.target.value || null }))}
                  className="scheduler-modal-input"
                  min={todayIso}
                />
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
      } catch (error) {
        if (!isAbortError(error)) {
          throw error;
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

  useEffect(() => {
    if (!email || typeof window === "undefined") return;
    const refreshKey = `${DASHBOARD_CALENDAR_REFRESH_KEY}:${email.toLowerCase()}`;
    if (sessionStorage.getItem(refreshKey)) return;
    sessionStorage.setItem(refreshKey, String(Date.now()));

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/schedule/refresh-connected", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok || controller.signal.aborted) return;

        const refreshed = Boolean(data?.outlook?.refreshed) || Boolean(data?.google?.refreshed);
        if (!refreshed) return;

        setScheduleRefreshKey((value) => value + 1);
        await refreshTasksFromApi(controller.signal);
      } catch (error) {
        if (!isAbortError(error)) {
          sessionStorage.removeItem(refreshKey);
        }
      }
    })();

    return () => controller.abort();
  }, [email, refreshTasksFromApi]);

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
    const timer = window.setTimeout(() => {
      void (async () => {
        setScheduleLoading(true);
        try {
          const weekRes = await fetch(`/api/schedule?weekStart=${selectedWeekIso}`, { signal: controller.signal, cache: "no-store" });
          const weekData = await weekRes.json().catch(() => ({}));
          if (weekRes.ok) {
            setScheduleEvents(Array.isArray(weekData?.events) ? weekData.events : []);
          }
        } catch (error) {
          if (!isAbortError(error)) {
            throw error;
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
  const accountName = String(displayName || email.split("@")[0] || "PrimaryAI").trim();
  const accountInitials = accountName
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "PA";
  const accountIcon = avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        objectFit: "cover",
        display: "block",
        boxShadow: "0 0 0 1px rgb(255 255 255 / 0.55)",
      }}
    />
  ) : (
    <span
      aria-hidden="true"
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.68rem",
        fontWeight: 800,
        letterSpacing: "0.03em",
        background: "color-mix(in srgb, var(--accent) 16%, white)",
        color: "var(--accent)",
      }}
    >
      {accountInitials}
    </span>
  );

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

  if (initialBootLoading) {
    return <DashboardBootSplash steps={bootSteps} />;
  }

  return (
    <main className="page-wrap">

      {/* Topbar: search bar */}
      <div className="dashboard-topbar">
        <button type="button" className="dashboard-cmdpal-btn dashboard-search-bar" onClick={openCommandPalette}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Search pages, lesson packs…</span>
          </span>
          <kbd className="cmdpal-kbd">⌘K</kbd>
        </button>
      </div>

      <div className={`dashboard-top-grid${schedulerViewMode === "term" ? " is-term-view" : ""}`} style={{ marginBottom: "1.25rem" }}>
        <div className="dashboard-wellbeing-row">
          <WellbeingSummaryCard />
        </div>
        <div className="dashboard-countdown-wrapper">
          <div className="term-countdown-stat">
            {!loading && activeTerm?.termStartDate && activeTerm?.termEndDate ? (
              <TermCountdownRing
                termName={activeTerm.termName || "Term"}
                termStartDate={activeTerm.termStartDate}
                termEndDate={activeTerm.termEndDate}
              />
            ) : !loading ? (
              <div style={{ padding: "1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", justifyContent: "center", flex: 1 }}>
                <span className="dashboard-hero-label">No active term set</span>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  Add your term dates in{" "}
                  <Link href="/settings" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                    Settings
                  </Link>{" "}
                  to see your countdown.
                </p>
              </div>
            ) : (
              <span className="dashboard-hero-value">–</span>
            )}
          </div>

          {/* This week at a glance */}
          {!loading && (() => {
            const weekNow = new Date();
            const weekMon = getMondayDate(weekNow);
            const weekSun = new Date(weekMon);
            weekSun.setDate(weekSun.getDate() + 6);
            const wFrom = toISODate(weekMon);
            const wTo = toISODate(weekSun);
            const weekLessons = scheduleEvents.filter((e) => e.event_type === "lesson_pack" && e.scheduled_date >= wFrom && e.scheduled_date <= wTo);
            const weekTasks = tasks.filter((t) => !t.completed && t.due_date >= wFrom && t.due_date <= wTo);
            const todayStr = toISODate(weekNow);
            const overdueTasks = tasks.filter((t) => !t.completed && t.due_date < todayStr);
            const p1Tasks = tasks.filter((t) => !t.completed && t.priority === "p1");
            if (weekLessons.length === 0 && weekTasks.length === 0 && overdueTasks.length === 0) return null;
            const badges = [
              weekLessons.length > 0 && { label: `${weekLessons.length} lesson${weekLessons.length !== 1 ? "s" : ""} this week`, color: "var(--accent)" },
              weekTasks.length > 0 && { label: `${weekTasks.length} task${weekTasks.length !== 1 ? "s" : ""} due`, color: "#f59e0b" },
              overdueTasks.length > 0 && { label: `${overdueTasks.length} overdue`, color: "#ef4444" },
              p1Tasks.length > 0 && { label: `${p1Tasks.length} P1 open`, color: "#ef4444" },
            ].filter(Boolean) as Array<{ label: string; color: string }>;
            if (badges.length === 0) return null;
            return (
              <div style={{ padding: "0.75rem 1rem 0.5rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {badges.map((b) => (
                  <span key={b.label} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "999px",
                    border: `1px solid color-mix(in srgb, ${b.color} 30%, var(--border))`,
                    background: `color-mix(in srgb, ${b.color} 8%, var(--surface))`,
                    color: b.color,
                    fontSize: "0.74rem",
                    fontWeight: 600,
                  }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: b.color, display: "inline-block" }} />
                    {b.label}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        <div
          className="dashboard-scheduler-wrapper"
          style={{
            borderRadius: "16px",
            border: "1px solid var(--border-card)",
            background: "var(--surface)",
            padding: 0,
            overflow: "hidden",
            alignSelf: "flex-start",
          }}
        >
          {initialBootLoading ? (
            <div
              style={{
                minHeight: "540px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.9rem",
                padding: "2rem 1.5rem",
                background: "var(--surface)",
              }}
            >
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  border: "3px solid rgb(var(--accent-rgb) / 0.18)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: "0 0 0.25rem", fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
                  Loading scheduler
                </p>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
                  Preparing timetable and calendar connections.
                </p>
              </div>
            </div>
          ) : (
            <SchedulerDrawer
              embedded
              open
              onClose={() => {}}
              onScheduleChange={handleScheduleMutation}
              onViewModeStateChange={setSchedulerViewMode}
              displayName={displayName || undefined}
              initialPacks={items.map((item) => ({
                id: item.id,
                title: item.title,
                subject: item.subject,
                yearGroup: item.yearGroup,
                topic: item.topic,
              }))}
              initialWeekEvents={scheduleEvents}
            />
          )}
        </div>

        <div className={`dashboard-hero-side-wrap${schedulerViewMode === "term" ? " is-below-term" : ""}`}>
          <div className="dashboard-hero dashboard-hero-side">
          </div>
          <AiSchedulePanel onScheduleChange={handleScheduleMutation} />
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
          <WorkloadSuggestionsStrip />
          <PersonalTasksCard
            tasks={tasks}
            onTasksChange={setTasks}
            onScheduleRefresh={handleTaskCrudRefresh}
          />
          <NotesWidget />
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
              icon={accountIcon}
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
