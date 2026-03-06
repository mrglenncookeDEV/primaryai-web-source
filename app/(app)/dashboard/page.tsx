"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { subjectColor } from "@/lib/subjectColor";
import { ScheduleEventIcon } from "@/lib/schedule-event-icon";

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

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
  tasks?: PersonalTask[];
};

const DASHBOARD_CACHE_KEY = "pa_dashboard_summary_v2";
const DASHBOARD_CACHE_TTL_MS = 30_000;

function getClientSessionEmail(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)pa_session=([^;]+)/);
  if (!match?.[1]) return "";

  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded);
    return typeof parsed?.email === "string" ? parsed.email : "";
  } catch {
    return "";
  }
}

function getClientSessionIdentity(): { userId: string; email: string } {
  if (typeof document === "undefined") return { userId: "", email: "" };

  const legacyEmail = getClientSessionEmail();
  const cookies = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const tokenCookie = cookies.find((entry) => entry.includes("-auth-token="));
  if (!tokenCookie) {
    return { userId: "", email: legacyEmail };
  }

  const rawValue = tokenCookie.slice(tokenCookie.indexOf("=") + 1);
  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);
    const accessToken =
      Array.isArray(parsed) && typeof parsed[0] === "string"
        ? parsed[0]
        : typeof parsed?.access_token === "string"
          ? parsed.access_token
          : "";
    if (!accessToken) {
      return { userId: "", email: legacyEmail };
    }

    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) {
      return { userId: "", email: legacyEmail };
    }

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json);
    return {
      userId: typeof payload?.sub === "string" ? payload.sub : "",
      email: typeof payload?.email === "string" ? payload.email : legacyEmail,
    };
  } catch {
    return { userId: "", email: legacyEmail };
  }
}

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
                  const isPersonal = (evt.event_type === "custom" && String(evt.event_category || "").toLowerCase() === "personal")
                    || String(evt.subject || "").toLowerCase() === "personal";
                  const isConflict = conflictIds.has(evt.id);
                  const isHighTask = isTask && String(evt.title || "").toLowerCase().startsWith("high priority:");
                  const color = isTask
                    ? (isHighTask ? "#ef4444" : "#4169e1")
                    : isPersonal
                      ? "#9ca3af"
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

function LibraryOverview({ items, scheduleEvents, loading, weekStart }: { items: LibraryItem[]; scheduleEvents: ScheduleEvent[]; loading: boolean; weekStart: Date }) {
  // Subject breakdown
  const subjectCounts = items.reduce((acc, item) => {
    acc[item.subject] = (acc[item.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedSubjects = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = sortedSubjects[0]?.[1] || 1;
  const total = items.length;

  // 7-day activity aligned to the selected schedule week
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const weekIsoSet = new Set(weekDays.map((day) => day.toISOString().split("T")[0]));
  const daySubjectCounts = weekDays.map((day) => {
    const iso = day.toISOString().split("T")[0];
    const bySubject = scheduleEvents.reduce((acc, evt) => {
      if (String(evt.scheduled_date || "") !== iso) return acc;
      const subject = String(evt.subject || "Other");
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalForDay = Object.values(bySubject).reduce((sum, value) => sum + value, 0);
    return { iso, bySubject, totalForDay };
  });
  const weeklySubjectCounts = scheduleEvents.reduce((acc, evt) => {
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
  const dayLabels = weekDays.map(d => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()]);
  const todayIso = toISODate(new Date());
  const stackLegend = [
    ...topSubjects.map((subject) => ({ subject, color: subjectColor(subject), count: weeklySubjectCounts[subject] || 0 })),
    ...(Object.keys(weeklySubjectCounts).some((subject) => !topSubjects.includes(subject))
      ? [{ subject: "Other", color: "#94a3b8", count: Object.entries(weeklySubjectCounts).reduce((sum, [subject, count]) => topSubjects.includes(subject) ? sum : sum + count, 0) }]
      : []),
  ].filter((item) => item.count > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.85rem" }}>

      {/* 7-day activity chart */}
      <div style={{
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

            {/* Bar chart */}
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
                        background: day.total > 0
                          ? "transparent"
                          : "var(--border)",
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

function PersonalTasksCard({
  tasks,
  onTasksChange,
  onScheduleRefresh,
}: {
  tasks: PersonalTask[];
  onTasksChange: (tasks: PersonalTask[]) => void;
  onScheduleRefresh: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => toISODate(new Date()));
  const [dueTime, setDueTime] = useState("16:00");
  const [importance, setImportance] = useState<"low" | "high">("low");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; due_date: string; due_time: string; importance: "low" | "high"; completed: boolean } | null>(null);
  const [error, setError] = useState("");

  async function refreshTasks() {
    const res = await fetch("/api/tasks?includeCompleted=true");
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.tasks)) {
      onTasksChange(data.tasks);
    }
  }

  async function createTask() {
    const taskTitle = title.trim();
    if (!taskTitle || !dueDate) {
      setError("Add a title and due date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle, dueDate, dueTime, importance }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not create task");
      }
      setTitle("");
      setDueTime("16:00");
      setImportance("low");
      await refreshTasks();
      onScheduleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(task: PersonalTask) {
    setEditingId(task.id);
    setEditDraft({
      title: task.title,
      due_date: task.due_date,
      due_time: task.due_time ? String(task.due_time).slice(0, 5) : "16:00",
      importance: task.importance,
      completed: Boolean(task.completed),
    });
    setError("");
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          dueDate: editDraft.due_date,
          dueTime: editDraft.due_time,
          importance: editDraft.importance,
          completed: editDraft.completed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not update task");
      }
      setEditingId(null);
      setEditDraft(null);
      await refreshTasks();
      onScheduleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task");
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
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="personal-tasks-card">
      <div className="personal-tasks-header">
        <p className="personal-tasks-eyebrow">
          Personal To-Do
        </p>
        <span className="personal-tasks-count">{sortedTasks.filter((t) => !t.completed).length} open</span>
      </div>

      <div className="personal-tasks-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="field personal-task-input"
        />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field personal-task-input" />
        <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="field personal-task-input" />
        <select value={importance} onChange={(e) => setImportance(e.target.value === "high" ? "high" : "low")} className="field personal-task-input">
          <option value="low">Low</option>
          <option value="high">High</option>
        </select>
        <button className="button personal-task-add-btn" onClick={() => { void createTask(); }} disabled={saving}>
          Add
        </button>
      </div>

      {error ? <p className="personal-tasks-error">{error}</p> : null}

      <div className="personal-tasks-list">
        {sortedTasks.length === 0 ? (
          <p className="personal-tasks-empty">No tasks yet.</p>
        ) : (
          sortedTasks.map((task) => {
            const isEditing = editingId === task.id && editDraft;
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
              <div key={task.id} className={`personal-task-row${task.completed ? " is-completed" : ""}${isOverdue ? " is-overdue" : ""}`}>
                {isEditing ? (
                  <div className="personal-task-edit-grid">
                    <input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                      className="field personal-task-input"
                    />
                    <input
                      type="date"
                      value={editDraft.due_date}
                      onChange={(e) => setEditDraft({ ...editDraft, due_date: e.target.value })}
                      className="field personal-task-input"
                    />
                    <input
                      type="time"
                      value={editDraft.due_time}
                      onChange={(e) => setEditDraft({ ...editDraft, due_time: e.target.value })}
                      className="field personal-task-input"
                    />
                    <select
                      value={editDraft.importance}
                      onChange={(e) => setEditDraft({ ...editDraft, importance: e.target.value === "high" ? "high" : "low" })}
                      className="field personal-task-input"
                    >
                      <option value="low">Low</option>
                      <option value="high">High</option>
                    </select>
                    <button className="button" onClick={() => { void saveEdit(); }} disabled={saving}>Save</button>
                    <button className="button secondary" onClick={() => { setEditingId(null); setEditDraft(null); }} disabled={saving}>Cancel</button>
                  </div>
                ) : (
                  <div className="personal-task-grid">
                    <input type="checkbox" checked={task.completed} onChange={() => { void toggleCompleted(task); }} />
                    <div style={{ minWidth: 0 }}>
                      <p className="personal-task-title">
                        {task.title}
                      </p>
                      <p className="personal-task-meta">
                        Due {dueLabel}{task.due_time ? ` at ${String(task.due_time).slice(0, 5)}` : ""} · <span className={`personal-task-priority ${task.importance === "high" ? "is-high" : "is-low"}`}>{task.importance === "high" ? "High" : "Low"} importance</span>
                      </p>
                    </div>
                    <div className="personal-task-actions">
                      <button
                        className="button secondary"
                        onClick={() => { void toggleCompleted(task); }}
                        disabled={saving}
                      >
                        {task.completed ? "Undo" : "Done"}
                      </button>
                      <button className="button secondary" onClick={() => beginEdit(task)} disabled={saving}>Edit</button>
                      <button className="button secondary" onClick={() => { void deleteTask(task); }} disabled={saving}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
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
  const [loading, setLoading] = useState(true);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(true);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  const refreshTasksFromApi = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/tasks?includeCompleted=true", signal ? { signal } : undefined);
      const data = await res.json().catch(() => ({}));
      if (!(signal?.aborted) && res.ok && Array.isArray(data?.tasks)) {
        setTasks(data.tasks);
      }
    } catch {
      // Keep existing task state if task refresh fails.
    }
  }, []);

  useEffect(() => {
    let hydratedFromCache = false;
    const cachedRaw = typeof window !== "undefined" ? sessionStorage.getItem(DASHBOARD_CACHE_KEY) : null;
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { ts?: number; data?: DashboardSummaryPayload };
        const age = Date.now() - Number(cached?.ts || 0);
        const cachedUserId = String(cached?.data?.userId ?? "");
        const cachedEmail = String(cached?.data?.email ?? "");
        const { userId: activeSessionUserId, email: activeSessionEmail } = getClientSessionIdentity();
        const userMatches = Boolean(activeSessionUserId) && Boolean(cachedUserId) && activeSessionUserId === cachedUserId;
        const emailMatches = Boolean(activeSessionEmail) && Boolean(cachedEmail) && activeSessionEmail === cachedEmail;
        const canHydrateCache = Boolean(cached?.data) && (userMatches || emailMatches);

        if (canHydrateCache && cached?.data) {
          setItems(normaliseLibraryItems(cached.data.libraryItems));
          setScheduleEvents(Array.isArray(cached.data.scheduleEvents) ? cached.data.scheduleEvents : []);
          setEmail(String(cached.data.email ?? ""));
          setDisplayName(cached.data.profileSetup?.displayName ?? "");
          setAvatarUrl(cached.data.profileSetup?.avatarUrl ?? "");
          setTasks(Array.isArray(cached.data.tasks) ? cached.data.tasks : []);
          hydratedFromCache = true;
          setScheduleLoading(false);
          setLoading(false);
          if (age >= 0 && age < DASHBOARD_CACHE_TTL_MS) {
            setDashboardRefreshing(false);
            return;
          }
        } else {
          sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
        }
      } catch {
        // Ignore malformed cache.
      }
    }

    void (async () => {
      try {
        const res = await fetch("/api/dashboard/summary");
        if (res.ok) {
          const data = (await res.json()) as DashboardSummaryPayload;
          setItems(normaliseLibraryItems(data?.libraryItems));
          setScheduleEvents(Array.isArray(data?.scheduleEvents) ? data.scheduleEvents : []);
          setEmail(String(data?.email ?? ""));
          setDisplayName(data?.profileSetup?.displayName ?? "");
          setAvatarUrl(data?.profileSetup?.avatarUrl ?? "");
          setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
          }
        }
      } finally {
        setScheduleLoading(false);
        setLoading(false);
        setDashboardRefreshing(false);
        if (!hydratedFromCache) {
          setScheduleLoading(false);
          setLoading(false);
        }
      }
    })();
  }, []);

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
    const timer = window.setTimeout(() => {
      void (async () => {
        setScheduleLoading(true);
        try {
          const res = await fetch(`/api/schedule?weekStart=${selectedWeekIso}`, { signal: controller.signal });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setScheduleEvents(Array.isArray(data?.events) ? data.events : []);
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
  const todayISO = toISODate(new Date());
  const uniqueSubjects = useMemo(() => new Set(items.map((i) => i.subject)).size, [items]);
  const todayCount = useMemo(
    () => scheduleEvents.filter((e) => e.scheduled_date === todayISO).length,
    [scheduleEvents, todayISO],
  );
  const countPacks = useCountUp(loading ? 0 : items.length);
  const countSubjects = useCountUp(loading ? 0 : uniqueSubjects);
  const countScheduled = useCountUp(scheduleLoading ? 0 : scheduleEvents.length);
  const countToday = useCountUp(scheduleLoading ? 0 : todayCount, 600);

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
    return { topSubject: topEntry?.[0], topPct, missing, coveredCount: covered.size };
  }, [items]);

  return (
    <main className="page-wrap">
      {dashboardRefreshing && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "88px",
            transform: "translateX(-50%)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: "0.55rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "var(--text)",
            border: "1px solid #22c55e",
            background: "var(--surface)",
            borderRadius: "999px",
            boxShadow: "0 10px 28px rgba(10, 18, 28, 0.12)",
            padding: "0.5rem 0.9rem",
            animation: "pulse 1.6s ease-in-out infinite",
            pointerEvents: "none",
          }}
          role="status"
          aria-live="polite"
        >
          <span
            style={{
              width: "12px",
              height: "12px",
              border: "1.8px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Loading Dashboard…
        </div>
      )}

      {/* Greeting header */}
      <div style={{ padding: "0.2rem 0 0.35rem", marginBottom: "0.65rem" }}>
        <div className="dashboard-greeting-row" style={{ display: "flex", alignItems: "center", gap: "0.8rem", margin: "0 0 0.2rem" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{
                width: "62px",
                height: "62px",
                borderRadius: "999px",
                objectFit: "cover",
                border: "1px solid #fff",
                boxShadow: "0 0 0 3px #22c55e, 0 0 0 4px #000",
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: "62px",
              height: "62px",
              borderRadius: "999px",
              border: "1px solid #fff",
              boxShadow: "0 0 0 3px #22c55e, 0 0 0 4px #000",
              background: "var(--field-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              fontSize: "1.25rem",
              fontWeight: 300,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <h1 style={{
            margin: 0,
            fontSize: "clamp(1.45rem, 5vw, 2rem)",
            fontWeight: 300,
            letterSpacing: "-0.04em",
            color: "var(--accent)",
            lineHeight: 1,
          }}>
            {greetingLine}
          </h1>
        </div>
        <div className="dashboard-greeting-actions" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.2rem" }}>
          {(!displayName && email) ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", paddingLeft: "70px" }}>
              {email}
            </p>
          ) : <span />}
          <button
            type="button"
            className="dashboard-cmdpal-btn"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "k", bubbles: true }))}
            aria-label="Open command palette"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Search
            <kbd style={{ fontSize: "0.64rem", padding: "0.1rem 0.35rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--btn-bg)", lineHeight: 1 }}>⌘K</kbd>
          </button>
        </div>
      </div>

      {/* ── Hero stats strip ── */}
      <div className="dashboard-hero" style={{ marginBottom: "1.25rem" }}>
        <div className="dashboard-hero-stat">
          <svg className="dashboard-hero-stat-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="dashboard-hero-value">{loading ? "–" : countPacks}</span>
          <span className="dashboard-hero-label">Lesson Packs</span>
          {!loading && <span className="dashboard-hero-sub">{items.length === 0 ? "get started" : "in your library"}</span>}
        </div>
        <div className="dashboard-hero-stat">
          <svg className="dashboard-hero-stat-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          <span className="dashboard-hero-value">{loading ? "–" : countSubjects}</span>
          <span className="dashboard-hero-label">Subjects</span>
          {!loading && <span className="dashboard-hero-sub">{uniqueSubjects > 0 ? `${uniqueSubjects} covered` : "none yet"}</span>}
        </div>
        <div className="dashboard-hero-stat">
          <svg className="dashboard-hero-stat-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className="dashboard-hero-value">{scheduleLoading ? "–" : countScheduled}</span>
          <span className="dashboard-hero-label">Scheduled</span>
          {!scheduleLoading && <span className="dashboard-hero-sub">this week</span>}
        </div>
        <div className="dashboard-hero-stat">
          <svg className="dashboard-hero-stat-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="dashboard-hero-value" style={!scheduleLoading && todayCount > 0 ? { color: "var(--accent)" } : {}}>
            {scheduleLoading ? "–" : countToday}
          </span>
          <span className="dashboard-hero-label">Today</span>
          {!scheduleLoading && (
            <span className="dashboard-hero-sub">{todayCount > 0 ? `${todayCount} lesson${todayCount !== 1 ? "s" : ""}` : "nothing scheduled"}</span>
          )}
        </div>
        <div className="dashboard-hero-stat">
          <svg className="dashboard-hero-stat-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <span className="dashboard-hero-label">Insight</span>
          <span
            style={{
              marginTop: "0.2rem",
              fontSize: "0.8rem",
              lineHeight: 1.45,
              color: "var(--text)",
              fontWeight: 500,
            }}
          >
            {loading || !insightData
              ? "No insight yet."
              : insightData.missing.length > 0
                ? `Consider adding ${insightData.missing.slice(0, 2).join(" or ")} packs to broaden coverage.`
                : `Excellent. You cover ${insightData.coveredCount} subjects in your library, with ${insightData.topSubject} as your top subject at ${insightData.topPct}%.`}
          </span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="dashboard-main-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr minmax(300px, 380px)",
        gap: "1.25rem",
        alignItems: "start",
      }}>

        {/* ── LEFT: scheduler ── */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>

          {/* Full Scheduler */}
          <div style={{
            borderRadius: "16px",
            border: "1px solid var(--border-card)",
            background: "var(--surface)",
            padding: 0,
            overflow: "hidden",
          }}>
            <SchedulerDrawer
              embedded
              open
              onClose={() => {}}
              onScheduleChange={handleScheduleMutation}
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

          <PersonalTasksCard
            tasks={tasks}
            onTasksChange={setTasks}
            onScheduleRefresh={handleTaskCrudRefresh}
          />

        </div>{/* /left column */}

        {/* ── RIGHT: quick actions + library visuals ── */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <ActionCard
              href="/lesson-pack"
              accent
              title="Generate Lesson Pack"
              desc="AI-powered resources for any topic in seconds"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              }
            />

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
          <LibraryOverview items={items} scheduleEvents={scheduleEvents} loading={loading} weekStart={weekStart} />

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
                const color = subjectColor(item.subject);
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
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "10px",
                        background: `color-mix(in srgb, ${color} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", color,
                      }}>
                        {item.subject.slice(0, 3).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 0.2rem", fontSize: "0.87rem", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.topic}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" as const }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.08rem 0.45rem", borderRadius: "999px", background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{item.yearGroup}</span>
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

      </div>{/* /outer grid */}

    </main>
  );
}
