"use client";

import { useRef, useState } from "react";
import { BsWatch } from "react-icons/bs";

type AiEvent = {
  title: string;
  subject: string;
  year_group: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  event_type?: string;
  event_category?: string | null;
  notes?: string | null;
};

type SummaryData = {
  summary: string;
  highlights: string[];
  suggestions: string[];
};

type ReflectionVote = "agree" | "not_quite" | "ignore";

type PlanResponse = {
  events: AiEvent[];
  assumptions?: string[];
  confidence?: "high" | "medium" | "low";
};

type GapItem = {
  subject: string;
  severity: "high" | "medium" | "low" | "info";
  suggestion: string;
};

type Tab = "summary" | "plan" | "gaps" | "term";

function getMondayISO(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().split("T")[0];
}

function getTermRange() {
  const today = new Date();
  const from = new Date(today); from.setDate(today.getDate() - 30);
  const to = new Date(today); to.setDate(today.getDate() + 60);
  return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function severityColor(s: string) {
  if (s === "high") return "#ef4444";
  if (s === "medium") return "#f59e0b";
  if (s === "low") return "#3b82f6";
  return "#94a3b8";
}

const card: React.CSSProperties = {
  borderRadius: "18px", border: "1px solid var(--border-card)",
  background: "var(--surface)", padding: "1.4rem 1.35rem",
  position: "relative", overflow: "hidden",
  boxShadow: "0 4px 24px rgb(0 0 0 / 0.14), 0 1px 4px rgb(0 0 0 / 0.08)",
};

export default function AiSchedulePanel({ onScheduleChange }: { onScheduleChange?: () => void } = {}) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  // Summary
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryWeekStart, setSummaryWeekStart] = useState(getMondayISO());

  // Smart plan
  const [planDesc, setPlanDesc] = useState("");
  const [planWeekStart, setPlanWeekStart] = useState(getMondayISO());
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planEvents, setPlanEvents] = useState<AiEvent[] | null>(null);
  const [planMeta, setPlanMeta] = useState<{ assumptions: string[]; confidence: "high" | "medium" | "low" }>({
    assumptions: [],
    confidence: "medium",
  });
  const [planCommitting, setPlanCommitting] = useState(false);
  const [planDone, setPlanDone] = useState(false);
  const [planReviewTouched, setPlanReviewTouched] = useState(false);
  const [planEventFlags, setPlanEventFlags] = useState<Record<number, string[]>>({});
  const [planReviewPrompt, setPlanReviewPrompt] = useState("");
  const [planVote, setPlanVote] = useState<ReflectionVote | null>(null);

  // Gaps
  const [gaps, setGaps] = useState<{ gaps: GapItem[]; wellCovered: string[] } | null>(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsError, setGapsError] = useState("");
  const [summaryVote, setSummaryVote] = useState<ReflectionVote | null>(null);
  const [gapsVote, setGapsVote] = useState<ReflectionVote | null>(null);

  // Term plan
  const [termDocText, setTermDocText] = useState("");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [termLoading, setTermLoading] = useState(false);
  const [termError, setTermError] = useState("");
  const [termEvents, setTermEvents] = useState<AiEvent[] | null>(null);
  const [termCommitting, setTermCommitting] = useState(false);
  const [termDone, setTermDone] = useState(false);
  const [termFileUploading, setTermFileUploading] = useState(false);
  const termFileRef = useRef<HTMLInputElement>(null);

  async function trackTelemetry(event: string, payload: Record<string, unknown> = {}) {
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, payload }),
      });
    } catch {
      // Non-blocking
    }
  }

  function setReviewTouched(event: string, payload: Record<string, unknown> = {}) {
    setPlanReviewTouched(true);
    void trackTelemetry(event, payload);
  }

  function togglePlanEventFlag(index: number, flag: string) {
    setPlanEventFlags((prev) => {
      const current = prev[index] ?? [];
      const next = current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag];
      return { ...prev, [index]: next };
    });
    setReviewTouched("schedule_plan_flagged", { index, flag });
  }

  function planWarnings(events: AiEvent[], flags: Record<number, string[]>) {
    const warnings: string[] = [];
    if (!events.length) return warnings;

    if (events.some((evt) => evt.start_time < "09:00" || evt.end_time > "15:30")) {
      warnings.push("Some events sit outside a typical UK primary school day.");
    }
    if (events.some((evt) => evt.start_time < "13:00" && evt.end_time > "12:00")) {
      warnings.push("At least one event overlaps the usual lunch window.");
    }
    if (events.some((evt) => !evt.subject || evt.subject === "General")) {
      warnings.push("Some events still have a generic or missing subject.");
    }
    if (events.some((evt) => String(evt.title || "").trim().length < 10 || !String(evt.title || "").includes("-"))) {
      warnings.push("Some event titles are broad and may need sharpening before you add them.");
    }
    const lessonSubjects = Array.from(new Set(events.filter((evt) => evt.event_type !== "custom").map((evt) => evt.subject)));
    if (lessonSubjects.length > 0 && !lessonSubjects.some((subject) => !["Maths", "English"].includes(subject))) {
      warnings.push("This draft leans heavily on core subjects and may be missing foundation coverage.");
    }
    if (Object.values(flags).some((items) => items.length > 0)) {
      warnings.push("You have already flagged issues in the draft. Resolve or accept them before commit.");
    }

    return warnings;
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  async function loadSummary() {
    setSummaryLoading(true);
    setSummaryError("");
    setSummary(null);
    try {
      const res = await fetch(`/api/schedule/ai-summary?weekStart=${summaryWeekStart}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Summary failed");
      setSummary(data);
      setSummaryVote(null);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Could not load summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  // ── Gaps ────────────────────────────────────────────────────────────────────

  async function loadGaps() {
    const { from, to } = getTermRange();
    setGapsLoading(true);
    setGapsError("");
    setGaps(null);
    try {
      const res = await fetch(`/api/schedule/ai-gaps?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gap analysis failed");
      setGaps(data);
      setGapsVote(null);
    } catch (err) {
      setGapsError(err instanceof Error ? err.message : "Could not analyse gaps");
    } finally {
      setGapsLoading(false);
    }
  }

  // ── Smart plan ──────────────────────────────────────────────────────────────

  async function handleSmartPlan() {
    if (!planDesc.trim()) return;
    setPlanLoading(true);
    setPlanError("");
    setPlanEvents(null);
    setPlanMeta({ assumptions: [], confidence: "medium" });
    setPlanDone(false);
    setPlanReviewTouched(false);
    setPlanEventFlags({});
    setPlanReviewPrompt("");
    setPlanVote(null);
    try {
      const res = await fetch("/api/schedule/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: planDesc, weekStart: planWeekStart }),
      });
      const data = (await res.json()) as PlanResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Planning failed");
      setPlanEvents(data.events ?? []);
      setPlanMeta({
        assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
        confidence: data.confidence ?? "medium",
      });
      void trackTelemetry("schedule_plan_generated", {
        weekStart: planWeekStart,
        eventCount: data.events?.length ?? 0,
        confidence: data.confidence ?? "medium",
      });
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Planning failed");
    } finally {
      setPlanLoading(false);
    }
  }

  async function commitPlanEvents() {
    if (!planEvents?.length) return;
    if (!planReviewTouched) {
      const proceed = window.confirm("You have not reviewed this draft yet. Add events anyway?");
      if (!proceed) return;
      void trackTelemetry("schedule_plan_committed_without_review", { eventCount: planEvents.length });
    } else {
      void trackTelemetry("schedule_plan_committed_after_review", {
        eventCount: planEvents.length,
        flaggedEvents: Object.values(planEventFlags).filter((items) => items.length > 0).length,
      });
    }
    setPlanCommitting(true);
    setPlanError("");
    try {
      for (const evt of planEvents) {
        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: evt.title, subject: evt.subject,
            yearGroup: evt.year_group, scheduledDate: evt.scheduled_date,
            startTime: evt.start_time, endTime: evt.end_time,
            eventType: evt.event_type === "lesson_pack" ? "custom" : (evt.event_type ?? "custom"),
            eventCategory: evt.event_type === "lesson_pack" ? "planned_lesson" : (evt.event_category ?? null),
            notes: evt.notes ?? null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not save one of the planned events");
        }
      }
      setPlanDone(true);
      setPlanEvents(null);
      setPlanDesc("");
      onScheduleChange?.();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Could not save events");
    } finally {
      setPlanCommitting(false);
    }
  }

  // ── Term plan ───────────────────────────────────────────────────────────────

  async function handleTermFileUpload(files: FileList | null) {
    if (!files?.length) return;
    setTermFileUploading(true);
    setTermError("");
    const form = new FormData();
    form.append("file", files[0]);
    try {
      const res = await fetch("/api/lesson-pack/parse-context", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.text) setTermDocText(data.text);
      else setTermError(data.error ?? "Could not read file");
    } catch {
      setTermError("Could not upload file");
    } finally {
      setTermFileUploading(false);
    }
  }

  async function handleTermPlan() {
    if (!termDocText.trim() || !termStart || !termEnd) return;
    setTermLoading(true);
    setTermError("");
    setTermEvents(null);
    setTermDone(false);
    try {
      const res = await fetch("/api/schedule/ai-term-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText: termDocText, termStart, termEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Term planning failed");
      setTermEvents(data.events ?? []);
    } catch (err) {
      setTermError(err instanceof Error ? err.message : "Term planning failed");
    } finally {
      setTermLoading(false);
    }
  }

  async function commitTermEvents() {
    if (!termEvents?.length) return;
    setTermCommitting(true);
    setTermError("");
    try {
      for (const evt of termEvents) {
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: evt.title, subject: evt.subject,
            yearGroup: evt.year_group, scheduledDate: evt.scheduled_date,
            startTime: evt.start_time, endTime: evt.end_time,
            eventType: "lesson_pack", notes: evt.notes ?? null,
          }),
        });
      }
      setTermDone(true);
      setTermEvents(null);
      onScheduleChange?.();
    } catch (err) {
      setTermError(err instanceof Error ? err.message : "Could not save term plan");
    } finally {
      setTermCommitting(false);
    }
  }

  // ── Shared styles ────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: "100%", padding: "0.55rem 0.75rem", borderRadius: "9px",
    border: "1.5px solid var(--border)", background: "var(--field-bg)",
    color: "var(--text)", fontSize: "0.84rem", fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "0.4rem",
    padding: "0.58rem 1.25rem", borderRadius: "10px", border: "none",
    background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 75%, var(--accent-hover)) 100%)",
    color: "var(--accent-text)", fontSize: "0.82rem", fontFamily: "inherit",
    cursor: "pointer", fontWeight: 700, letterSpacing: "0.01em",
    boxShadow: "0 2px 12px rgb(var(--accent-rgb) / 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
  };

  const btnGhost: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "0.4rem",
    padding: "0.58rem 1rem", borderRadius: "10px",
    border: "1.5px solid var(--border)", background: "transparent",
    color: "var(--text)", fontSize: "0.82rem", fontFamily: "inherit",
    cursor: "pointer", fontWeight: 600,
  };

  const panelStack: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  };

  const sectionCard: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "color-mix(in srgb, var(--field-bg) 75%, transparent)",
    padding: "0.95rem",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  };

  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--muted)",
    marginBottom: "0.35rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const helperCopy: React.CSSProperties = {
    margin: 0,
    fontSize: "0.8rem",
    color: "var(--muted)",
    lineHeight: 1.55,
  };

  const controlRow: React.CSSProperties = {
    display: "flex",
    gap: "0.55rem",
    alignItems: "flex-end",
    flexWrap: "wrap",
  };

  const previewList: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    maxHeight: "240px",
    overflowY: "auto",
  };

  const previewCard: React.CSSProperties = {
    padding: "0.65rem 0.85rem",
    borderRadius: "10px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderLeft: "3px solid rgb(var(--accent-rgb) / 0.5)",
  };

  const reviewChip: React.CSSProperties = {
    fontSize: "0.72rem",
    fontWeight: 600,
    fontFamily: "inherit",
    borderRadius: "999px",
    cursor: "pointer",
    padding: "0.28rem 0.6rem",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--muted)",
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "Week Summary", icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>
      </svg>
    )},
    { id: "plan",    label: "Smart Plan", icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>
      </svg>
    )},
    { id: "gaps",    label: "Gap Check", icon: <BsWatch size={13} style={{ flexShrink: 0 }} /> },
    { id: "term",    label: "Term Plan", icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    )},
  ];

  const successBox: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.8rem 1rem", borderRadius: "12px",
    background: "color-mix(in srgb, #22c55e 10%, transparent)",
    border: "1px solid color-mix(in srgb, #22c55e 28%, transparent)",
    color: "#16a34a", fontSize: "0.83rem", fontWeight: 600,
  };

  const skeleton = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {[100, 80, 65].map((w, i) => (
        <div key={i} style={{ height: "12px", borderRadius: "6px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite", width: `${w}%`, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );

  return (
    <div style={card}>
      {/* Radial glow in top-right corner */}
      <div style={{ position: "absolute", top: 0, right: 0, width: "160px", height: "120px", background: "radial-gradient(ellipse at 100% 0%, rgb(var(--accent-rgb) / 0.13) 0%, transparent 70%)", borderRadius: "0 18px 0 0", pointerEvents: "none" }} />
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent 0%, rgb(var(--accent-rgb) / 0.7) 30%, rgb(var(--accent-rgb) / 0.9) 50%, rgb(var(--accent-rgb) / 0.7) 70%, transparent 100%)", borderRadius: "18px 18px 0 0" }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", marginBottom: "1.25rem", position: "relative" }}>
        {/* Icon tile */}
        <div style={{
          width: "46px", height: "46px", borderRadius: "13px", flexShrink: 0,
          background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 55%, #9333ea) 0%, var(--accent) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgb(var(--accent-rgb) / 0.45), 0 1px 3px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.28)",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.1L18 9l-4.5 1.9L12 15l-1.5-4.1L6 9l4.5-1.9L12 3z" fill="white" fillOpacity="0.3"/>
            <path d="M12 3l1.5 4.1L18 9l-4.5 1.9L12 15l-1.5-4.1L6 9l4.5-1.9L12 3z"/>
            <path d="M19.5 15l.8 2L22 18l-1.7.8-.8 2-.8-2L17 18l1.7-.8.8-2z"/>
          </svg>
        </div>
        <div style={{ minWidth: 0, paddingTop: "0.1rem" }}>
          <p style={{ margin: "0 0 0.22rem", fontSize: "0.95rem", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text)", lineHeight: 1.2 }}>
            AI Schedule Assistant
          </p>
          <p style={{ margin: 0, fontSize: "0.77rem", lineHeight: 1.55, color: "var(--muted)" }}>
            Summarise your week, build smart plans, and spot curriculum gaps.
          </p>
        </div>
      </div>

      {/* Segmented tab control */}
      <div style={{ display: "flex", padding: "3px", borderRadius: "12px", gap: "2px", background: "var(--field-bg)", border: "1px solid var(--border)", marginBottom: "1.1rem" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
            padding: "0.48rem 0.3rem", borderRadius: "9px", fontSize: "0.71rem",
            fontFamily: "inherit", cursor: "pointer", fontWeight: activeTab === t.id ? 700 : 500,
            border: "none",
            background: activeTab === t.id ? "var(--surface)" : "transparent",
            color: activeTab === t.id ? "var(--text)" : "var(--muted)",
            boxShadow: activeTab === t.id ? "0 1px 5px rgba(0,0,0,0.13), 0 0 0 0.5px rgba(0,0,0,0.07)" : "none",
            transition: "background 150ms, color 150ms, box-shadow 150ms",
            whiteSpace: "nowrap",
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {activeTab === "summary" && (
        <div style={panelStack}>
          <div style={sectionCard}>
            <div style={controlRow}>
            <div style={{ minWidth: "170px", flex: "1 1 170px" }}>
              <label style={fieldLabel}>Week starting</label>
              <input type="date" value={summaryWeekStart} onChange={(e) => { setSummaryWeekStart(e.target.value); setSummary(null); }} style={{ ...inp, width: "auto" }} />
            </div>
            <button onClick={() => void loadSummary()} disabled={summaryLoading} style={{ ...btnPrimary, opacity: summaryLoading ? 0.6 : 1 }}>
              {!summaryLoading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/></svg>}
              {summaryLoading ? "Summarising…" : summary ? "Refresh" : "Summarise my week"}
            </button>
            </div>
          </div>
          {summaryLoading && skeleton}
          {summaryError && <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444" }}>{summaryError}</p>}
          {summary && !summaryLoading && (
            <div style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text)" }}>{summary.summary}</p>
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>Your Judgment</p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {[
                    { id: "agree", label: "Agree" },
                    { id: "not_quite", label: "Not quite" },
                    { id: "ignore", label: "Ignore" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSummaryVote(item.id as ReflectionVote);
                        void trackTelemetry("schedule_summary_judged", { vote: item.id });
                      }}
                      style={{
                        ...reviewChip,
                        border: summaryVote === item.id ? "1px solid var(--accent)" : reviewChip.border,
                        background: summaryVote === item.id ? "rgb(var(--accent-rgb) / 0.12)" : reviewChip.background,
                        color: summaryVote === item.id ? "var(--accent)" : reviewChip.color,
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {summary.highlights.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>Highlights</p>
                  <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {summary.highlights.map((h, i) => <li key={i} style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.55, marginBottom: "0.2rem" }}>{h}</li>)}
                  </ul>
                </div>
              )}
              {summary.suggestions.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)" }}>Suggestions</p>
                  <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {summary.suggestions.map((s, i) => <li key={i} style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.55, marginBottom: "0.2rem" }}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SMART PLAN ── */}
      {activeTab === "plan" && (
        <div style={panelStack}>
          {planDone && <div style={successBox}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>Events added to your schedule.</div>}
          <div style={sectionCard}>
            <div style={{ ...panelStack, gap: "0.75rem" }}>
            <div>
            <label style={fieldLabel}>Week starting</label>
            <input type="date" value={planWeekStart} onChange={(e) => setPlanWeekStart(e.target.value)} style={{ ...inp, width: "auto" }} />
          </div>
          <div>
            <label style={fieldLabel}>Describe your week</label>
            <textarea
              value={planDesc}
              onChange={(e) => setPlanDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSmartPlan(); }}
              placeholder="e.g. Maths every morning 9–10, English after break, PE on Wednesday afternoon, Science Friday…"
              rows={3}
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
            />
            <p style={{ ...helperCopy, marginTop: "0.4rem" }}>Use a rough timetable description. The assistant will turn it into draft events for review.</p>
          </div>
            </div>
          </div>
          {planError && <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444" }}>{planError}</p>}
          <button onClick={() => void handleSmartPlan()} disabled={planLoading || !planDesc.trim()} style={{ ...btnPrimary, alignSelf: "flex-start", opacity: (planLoading || !planDesc.trim()) ? 0.6 : 1 }}>
            {!planLoading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>}
            {planLoading ? "Generating…" : "Generate plan"}
          </button>
          {planEvents && planEvents.length > 0 && (
            <div style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <div style={{ ...sectionCard, padding: "0.8rem 0.9rem" }}>
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                  Check the draft
                </p>
                <p style={{ margin: "0 0 0.45rem", fontSize: "0.82rem", color: planMeta.confidence === "high" ? "#16a34a" : planMeta.confidence === "low" ? "#f59e0b" : "var(--accent)", fontWeight: 700 }}>
                  Confidence: {planMeta.confidence.toUpperCase()}
                </p>
                {planMeta.assumptions.length > 0 && (
                  <div style={{ marginBottom: "0.55rem" }}>
                    <p style={{ margin: "0 0 0.2rem", fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700 }}>AI assumptions</p>
                    <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                      {planMeta.assumptions.map((item, index) => (
                        <li key={index} style={{ fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.5 }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  {[
                    "What assumption did the AI make?",
                    "What is missing from this week?",
                    "Which event would you change first?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setPlanReviewPrompt(prompt);
                        setReviewTouched("schedule_plan_review_opened", { prompt });
                      }}
                      style={{ ...reviewChip, textAlign: "left", justifyContent: "flex-start" as const }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                {planReviewPrompt && (
                  <p style={{ margin: "0.55rem 0 0", fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.5 }}>
                    Your judgment prompt: {planReviewPrompt}
                  </p>
                )}
                {planWarnings(planEvents, planEventFlags).length > 0 && (
                  <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {planWarnings(planEvents, planEventFlags).map((warning) => (
                      <p key={warning} style={{ margin: 0, fontSize: "0.78rem", color: "#f59e0b", lineHeight: 1.45 }}>
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                Preview — {planEvents.length} event{planEvents.length !== 1 ? "s" : ""}
              </p>
              <div style={previewList}>
                {planEvents.map((evt, i) => (
                  <div key={i} style={previewCard}>
                    <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.82rem", color: "var(--text)" }}>{evt.title}</p>
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)" }}>{formatDate(evt.scheduled_date)} · {evt.start_time}–{evt.end_time} · {evt.subject}</p>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                      {["Time wrong", "Subject wrong", "Too vague", "Missing context"].map((flag) => {
                        const active = (planEventFlags[i] ?? []).includes(flag);
                        return (
                          <button
                            key={flag}
                            type="button"
                            onClick={() => togglePlanEventFlag(i, flag)}
                            style={{
                              ...reviewChip,
                              padding: "0.22rem 0.5rem",
                              border: active ? "1px solid var(--accent)" : reviewChip.border,
                              background: active ? "rgb(var(--accent-rgb) / 0.12)" : reviewChip.background,
                              color: active ? "var(--accent)" : reviewChip.color,
                            }}
                          >
                            {flag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {[
                  { id: "agree", label: "Agree" },
                  { id: "not_quite", label: "Not quite" },
                  { id: "ignore", label: "Ignore" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPlanVote(item.id as ReflectionVote);
                      setReviewTouched("schedule_plan_judged", { vote: item.id });
                    }}
                    style={{
                      ...reviewChip,
                      border: planVote === item.id ? "1px solid var(--accent)" : reviewChip.border,
                      background: planVote === item.id ? "rgb(var(--accent-rgb) / 0.12)" : reviewChip.background,
                      color: planVote === item.id ? "var(--accent)" : reviewChip.color,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div style={controlRow}>
                <button onClick={() => void commitPlanEvents()} disabled={planCommitting} style={{ ...btnPrimary, opacity: planCommitting ? 0.6 : 1 }}>
                  {!planCommitting && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  {planCommitting ? "Adding…" : `Add ${planEvents.length} events to schedule`}
                </button>
                <button onClick={() => setPlanEvents(null)} style={btnGhost}>Discard</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GAP CHECK ── */}
      {activeTab === "gaps" && (
        <div style={panelStack}>
          <div style={sectionCard}>
          <p style={helperCopy}>
            Analyses your schedule over the past 30 days and next 60 days to find subjects that haven&apos;t been taught recently.
          </p>
          </div>
          <button onClick={() => void loadGaps()} disabled={gapsLoading} style={{ ...btnPrimary, alignSelf: "flex-start", opacity: gapsLoading ? 0.6 : 1 }}>
            {!gapsLoading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
            {gapsLoading ? "Analysing…" : gaps ? "Re-analyse" : "Check for gaps"}
          </button>
          {gapsLoading && skeleton}
          {gapsError && <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444" }}>{gapsError}</p>}
          {gaps && !gapsLoading && (
            <>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {[
                  { id: "agree", label: "Agree" },
                  { id: "not_quite", label: "Not quite" },
                  { id: "ignore", label: "Ignore" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setGapsVote(item.id as ReflectionVote);
                      void trackTelemetry("schedule_gaps_judged", { vote: item.id });
                    }}
                    style={{
                      ...reviewChip,
                      border: gapsVote === item.id ? "1px solid var(--accent)" : reviewChip.border,
                      background: gapsVote === item.id ? "rgb(var(--accent-rgb) / 0.12)" : reviewChip.background,
                      color: gapsVote === item.id ? "var(--accent)" : reviewChip.color,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {gaps.wellCovered.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {gaps.wellCovered.map((s) => (
                    <span key={s} style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "color-mix(in srgb, #22c55e 12%, transparent)", color: "#16a34a", border: "1px solid color-mix(in srgb, #22c55e 25%, transparent)" }}>
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}
              {gaps.gaps.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--muted)", fontStyle: "italic" }}>No significant gaps detected.</p>
              ) : (
                <div style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {gaps.gaps.map((gap, i) => {
                    const c = severityColor(gap.severity);
                    return (
                      <div key={i} style={{ padding: "0.55rem 0.8rem", borderRadius: "9px", background: `color-mix(in srgb, ${c} 8%, var(--field-bg))`, border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`, borderLeft: `3px solid ${c}` }}>
                        <p style={{ margin: "0 0 0.15rem", fontWeight: 700, fontSize: "0.8rem", color: c }}>{gap.subject}</p>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.45 }}>{gap.suggestion}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TERM PLAN ── */}
      {activeTab === "term" && (
        <div style={panelStack}>
          {termDone && <div style={successBox}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5"/></svg>Term plan added to your schedule.</div>}
          <div style={{ ...sectionCard, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.6rem" }}>
            <div>
              <label style={fieldLabel}>Term start</label>
              <input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={fieldLabel}>Term end</label>
              <input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={sectionCard}>
            <label style={fieldLabel}>Curriculum document</label>
            <textarea
              value={termDocText}
              onChange={(e) => setTermDocText(e.target.value)}
              placeholder="Paste your curriculum plan here, or upload a file below…"
              rows={5}
              style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
            />
            <input ref={termFileRef} type="file" style={{ display: "none" }} accept=".pdf,.docx,.doc,.xlsx,.csv,.txt,.md" onChange={(e) => void handleTermFileUpload(e.target.files)} />
            <button onClick={() => termFileRef.current?.click()} disabled={termFileUploading} style={{ ...btnGhost, marginTop: "0.5rem", fontSize: "0.76rem", padding: "0.38rem 0.75rem" }}>
              {!termFileUploading && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
              {termFileUploading ? "Uploading…" : "Upload file"}
            </button>
            <p style={{ ...helperCopy, marginTop: "0.45rem" }}>Paste or upload a curriculum overview, then review the generated lessons before adding them.</p>
          </div>
          {termError && <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444" }}>{termError}</p>}
          <button
            onClick={() => void handleTermPlan()}
            disabled={termLoading || !termDocText.trim() || !termStart || !termEnd}
            style={{ ...btnPrimary, alignSelf: "flex-start", opacity: (termLoading || !termDocText.trim() || !termStart || !termEnd) ? 0.6 : 1 }}
          >
            {!termLoading && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/></svg>}
            {termLoading ? "Generating term plan…" : "Generate term plan"}
          </button>
          {termEvents && termEvents.length > 0 && (
            <div style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                Preview — {termEvents.length} lesson{termEvents.length !== 1 ? "s" : ""}
              </p>
              <div style={previewList}>
                {termEvents.slice(0, 12).map((evt, i) => (
                  <div key={i} style={previewCard}>
                    <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.82rem", color: "var(--text)" }}>{evt.title}</p>
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)" }}>{formatDate(evt.scheduled_date)} · {evt.start_time}–{evt.end_time} · {evt.subject}</p>
                  </div>
                ))}
                {termEvents.length > 12 && (
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--muted)", fontStyle: "italic", padding: "0.2rem 0.75rem" }}>
                    …and {termEvents.length - 12} more lessons
                  </p>
                )}
              </div>
              <div style={controlRow}>
                <button onClick={() => void commitTermEvents()} disabled={termCommitting} style={{ ...btnPrimary, opacity: termCommitting ? 0.6 : 1 }}>
                  {!termCommitting && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  {termCommitting ? "Adding to schedule…" : `Add all ${termEvents.length} lessons`}
                </button>
                <button onClick={() => setTermEvents(null)} style={btnGhost}>Discard</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
