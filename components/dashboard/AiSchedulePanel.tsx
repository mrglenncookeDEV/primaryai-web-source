"use client";

import { useRef, useState } from "react";

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
  borderRadius: "16px", border: "1px solid var(--border-card)",
  background: "var(--surface)", padding: "1.1rem 1.1rem",
  position: "relative", overflow: "hidden",
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
  const [planCommitting, setPlanCommitting] = useState(false);
  const [planDone, setPlanDone] = useState(false);

  // Gaps
  const [gaps, setGaps] = useState<{ gaps: GapItem[]; wellCovered: string[] } | null>(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsError, setGapsError] = useState("");

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
    setPlanDone(false);
    try {
      const res = await fetch("/api/schedule/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: planDesc, weekStart: planWeekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Planning failed");
      setPlanEvents(data.events ?? []);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Planning failed");
    } finally {
      setPlanLoading(false);
    }
  }

  async function commitPlanEvents() {
    if (!planEvents?.length) return;
    setPlanCommitting(true);
    setPlanError("");
    try {
      for (const evt of planEvents) {
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: evt.title, subject: evt.subject,
            yearGroup: evt.year_group, scheduledDate: evt.scheduled_date,
            startTime: evt.start_time, endTime: evt.end_time,
            eventType: evt.event_type ?? "lesson_pack",
            eventCategory: evt.event_category ?? null,
            notes: evt.notes ?? null,
          }),
        });
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
    padding: "0.5rem 1.1rem", borderRadius: "10px", border: "none",
    background: "var(--accent)", color: "var(--accent-text)",
    fontSize: "0.84rem", fontFamily: "inherit", cursor: "pointer", fontWeight: 600,
  };

  const btnGhost: React.CSSProperties = {
    padding: "0.5rem 1rem", borderRadius: "10px",
    border: "1.5px solid var(--border)", background: "var(--surface)",
    color: "var(--text)", fontSize: "0.84rem", fontFamily: "inherit",
    cursor: "pointer", fontWeight: 500,
  };

  const panelStack: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  };

  const sectionCard: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "color-mix(in srgb, var(--field-bg) 82%, transparent)",
    padding: "0.85rem 0.9rem",
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
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "summary", label: "Week Summary", icon: "📋" },
    { id: "plan",    label: "Smart Plan",   icon: "✨" },
    { id: "gaps",    label: "Gap Check",    icon: "🔍" },
    { id: "term",    label: "Term Plan",    icon: "📅" },
  ];

  const successBox: React.CSSProperties = {
    padding: "0.75rem 1rem", borderRadius: "10px",
    background: "color-mix(in srgb, #22c55e 10%, transparent)",
    border: "1px solid color-mix(in srgb, #22c55e 30%, transparent)",
    color: "#16a34a", fontSize: "0.84rem",
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
      {/* accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, var(--accent) 0%, transparent 80%)" }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", marginBottom: "1rem" }}>
        <div style={{ width: "30px", height: "30px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgb(var(--accent-rgb) / 0.1)", color: "var(--accent)", flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" fill="currentColor" opacity="0.3"/>
            <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>
            <path d="M6 14l.7 1.6L8.3 16l-1.6.7L6 18.3l-.7-1.6L3.7 16l1.6-.7L6 14z"/>
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
            AI Schedule Assistant
          </p>
          <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5, color: "var(--muted)" }}>
            Summarise your week, build a plan, spot gaps, or turn a term document into a schedule.
          </p>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.4rem", marginBottom: "1rem" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "0.55rem 0.7rem", borderRadius: "10px", fontSize: "0.74rem",
            fontFamily: "inherit", cursor: "pointer", fontWeight: activeTab === t.id ? 700 : 500,
            border: `1.5px solid ${activeTab === t.id ? "var(--accent)" : "var(--border)"}`,
            background: activeTab === t.id ? "rgb(var(--accent-rgb) / 0.1)" : "var(--surface)",
            color: activeTab === t.id ? "var(--accent)" : "var(--text)",
            textAlign: "center",
          }}>
            {t.icon} {t.label}
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
              {summaryLoading ? "Summarising…" : summary ? "Refresh" : "Summarise my week"}
            </button>
            </div>
          </div>
          {summaryLoading && skeleton}
          {summaryError && <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444" }}>{summaryError}</p>}
          {summary && !summaryLoading && (
            <div style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text)" }}>{summary.summary}</p>
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
          {planDone && <div style={successBox}>Events added to your schedule.</div>}
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
            {planLoading ? "Generating…" : "Generate plan"}
          </button>
          {planEvents && planEvents.length > 0 && (
            <div style={{ ...sectionCard, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                Preview — {planEvents.length} event{planEvents.length !== 1 ? "s" : ""}
              </p>
              <div style={previewList}>
                {planEvents.map((evt, i) => (
                  <div key={i} style={previewCard}>
                    <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.82rem", color: "var(--text)" }}>{evt.title}</p>
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--muted)" }}>{formatDate(evt.scheduled_date)} · {evt.start_time}–{evt.end_time} · {evt.subject}</p>
                  </div>
                ))}
              </div>
              <div style={controlRow}>
                <button onClick={() => void commitPlanEvents()} disabled={planCommitting} style={{ ...btnPrimary, opacity: planCommitting ? 0.6 : 1 }}>
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
            {gapsLoading ? "Analysing…" : gaps ? "Re-analyse" : "Check for gaps"}
          </button>
          {gapsLoading && skeleton}
          {gapsError && <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444" }}>{gapsError}</p>}
          {gaps && !gapsLoading && (
            <>
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
          {termDone && <div style={successBox}>Term plan added to your schedule.</div>}
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
            <button onClick={() => termFileRef.current?.click()} disabled={termFileUploading} style={{ ...btnGhost, marginTop: "0.4rem", fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}>
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
