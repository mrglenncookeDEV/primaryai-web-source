"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

type LessonPack = {
  year_group: string;
  subject: string;
  topic: string;
  learning_objectives: string[];
  teacher_explanation: string;
  pupil_explanation: string;
  worked_example: string;
  common_misconceptions: string[];
  activities: { support: string; expected: string; greater_depth: string };
  send_adaptations: string[];
  plenary: string;
  mini_assessment: { questions: string[]; answers: string[] };
  slides: Array<{ title: string; bullets: string[]; speaker_notes?: string }>;
  _meta?: { autoSaved?: boolean };
};

type LessonPackResponse = LessonPack | { error: string };
type ExportResponse = { ok: boolean; format: string; data: unknown } | { error: string };

const YEAR_GROUPS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

const SUBJECT_GROUPS = [
  { label: "Core Subjects", subjects: ["Maths", "English", "Science"] },
  { label: "Humanities", subjects: ["History", "Geography"] },
  { label: "Arts & Technology", subjects: ["Art and Design", "Design and Technology", "Music", "Computing"] },
  { label: "Physical & Wellbeing", subjects: ["PE", "PSHE", "RE"] },
  { label: "Modern Foreign Languages", subjects: ["French", "Spanish", "German", "Mandarin", "Modern Foreign Languages"] },
];

function isPack(r: LessonPackResponse): r is LessonPack {
  return !("error" in r);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children, color = "var(--accent)" }: { children: ReactNode; color?: string }) {
  return (
    <h3 style={{
      margin: "0 0 0.85rem",
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color,
    }}>{children}</h3>
  );
}

function RevealItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ marginBottom: "0.85rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <span style={{
        flexShrink: 0,
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "rgb(var(--accent-rgb) / 0.14)",
        color: "var(--accent)",
        fontSize: "0.7rem",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "2px",
      }}>{index + 1}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text)" }}>{question}</p>
        {revealed ? (
          <p style={{
            margin: 0,
            fontSize: "0.83rem",
            lineHeight: 1.5,
            color: "#4ade80",
            padding: "0.4rem 0.75rem",
            borderRadius: "8px",
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.16)",
          }}>{answer}</p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.22rem 0.6rem",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 150ms ease, color 150ms ease",
            }}
          >Show answer</button>
        )}
      </div>
    </div>
  );
}

function SlideCard({ slide, index }: { slide: { title: string; bullets: string[]; speaker_notes?: string }; index: number }) {
  const [notesOpen, setNotesOpen] = useState(false);
  return (
    <div style={{
      border: "1px solid var(--border-card)",
      borderRadius: "12px",
      overflow: "hidden",
      minWidth: "256px",
      maxWidth: "272px",
      flexShrink: 0,
      background: "var(--surface)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        background: "rgb(var(--accent-rgb) / 0.07)",
        borderBottom: "1px solid var(--border-card)",
        padding: "0.55rem 0.8rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <span style={{
          flexShrink: 0,
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "var(--muted)",
          background: "var(--border)",
          padding: "0.1rem 0.4rem",
          borderRadius: "4px",
        }}>{index + 1}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3, flex: 1 }}>{slide.title}</span>
      </div>
      <div style={{ padding: "0.75rem 0.85rem", flex: 1 }}>
        <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
          {slide.bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: "0.25rem" }}>{b}</li>
          ))}
        </ul>
        {slide.speaker_notes && (
          <>
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              style={{
                marginTop: "0.65rem",
                fontSize: "0.72rem",
                color: "var(--muted)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span style={{ display: "inline-block", transition: "transform 180ms ease", transform: notesOpen ? "rotate(90deg)" : "none" }}>▶</span>
              {notesOpen ? "Hide notes" : "Speaker notes"}
            </button>
            {notesOpen && (
              <p style={{
                margin: "0.5rem 0 0",
                fontSize: "0.77rem",
                fontStyle: "italic",
                color: "var(--muted)",
                lineHeight: 1.55,
                paddingTop: "0.5rem",
                borderTop: "1px solid var(--border)",
              }}>{slide.speaker_notes}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LessonPackPage() {
  const [form, setForm] = useState({ year_group: "", subject: "", topic: "" });
  const [result, setResult] = useState<LessonPackResponse | null>(null);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      const profile = data?.profile;
      if (!profile) return;
      setForm((prev) => ({
        year_group: prev.year_group || profile.defaultYearGroup || "",
        subject: prev.subject || profile.defaultSubject || "",
        topic: prev.topic,
      }));
    })();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setExportResult(null);
    setSaveState("idle");
    setSaveMsg("");
    try {
      const res = await fetch("/api/lesson-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "slides-json" | "worksheet-json" | "printable-html") {
    if (!result || !isPack(result)) return;
    const res = await fetch("/api/lesson-pack/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, pack: result }),
    });
    setExportResult(await res.json());
  }

  async function handleManualSave() {
    if (!result || !isPack(result) || saveState === "saving" || saveState === "saved") return;
    setSaveState("saving");
    setSaveMsg("");
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: result }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveMsg(res.status === 401 ? "Sign in to save to your library" : (data?.error ?? "Save failed"));
    }
  }

  const pack = result && isPack(result) ? result : null;
  const errorMsg = result && !isPack(result) ? (result as { error: string }).error : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="page-wrap" style={{ maxWidth: 900 }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{
          margin: "0 0 0.3rem",
          fontSize: "1.6rem",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "var(--text)",
        }}>Lesson Pack Generator</h1>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5 }}>
          Complete, curriculum-aligned resources generated in seconds — objectives, differentiated activities, slides, and more.
        </p>
      </div>

      {/* ── Form card ── */}
      <div className="hero" style={{ marginBottom: "2rem" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "1rem" }}>

            <div className="field">
              <label>Year Group</label>
              <select
                value={form.year_group}
                onChange={(e) => setForm({ ...form, year_group: e.target.value })}
                required
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--field-bg)",
                  color: form.year_group ? "var(--text)" : "var(--muted)",
                  borderRadius: "10px",
                  padding: "0.62rem 0.7rem",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                  transition: "border-color 180ms ease",
                  appearance: "none" as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2393a4bf' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  paddingRight: "2.2rem",
                }}
              >
                <option value="" disabled>Select year group…</option>
                {YEAR_GROUPS.map((yg) => (
                  <option key={yg} value={yg}>{yg}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--field-bg)",
                  color: form.subject ? "var(--text)" : "var(--muted)",
                  borderRadius: "10px",
                  padding: "0.62rem 0.7rem",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                  transition: "border-color 180ms ease",
                  appearance: "none" as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2393a4bf' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  paddingRight: "2.2rem",
                }}
              >
                <option value="" disabled>Select subject…</option>
                {SUBJECT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Topic</label>
              <input
                placeholder="e.g. Fractions, The Water Cycle…"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="nav-btn-cta"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "0.85rem 1.5rem",
              fontSize: "0.92rem",
              borderRadius: "12px",
              opacity: loading ? 0.72 : 1,
              gap: "0.6rem",
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.65s linear infinite",
                  flexShrink: 0,
                }} />
                Generating your lesson pack…
              </>
            ) : "Generate Lesson Pack"}
          </button>
        </form>
      </div>

      {/* ── Error ── */}
      {errorMsg && (
        <div className="auth-message is-error" style={{ marginBottom: "1.5rem" }}>
          <span className="auth-message-icon">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 10.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5V4.5h1.5V8.5z" />
            </svg>
          </span>
          <span className="auth-message-text">{errorMsg}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--muted)" }}>
          <div style={{
            width: "44px",
            height: "44px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.75s linear infinite",
            margin: "0 auto 1.2rem",
          }} />
          <p style={{ margin: "0 0 0.3rem", fontSize: "0.95rem", color: "var(--text)", fontWeight: 500 }}>Crafting your lesson resources…</p>
          <p style={{ margin: 0, fontSize: "0.82rem", opacity: 0.55 }}>This usually takes 10–20 seconds</p>
        </div>
      )}

      {/* ── Result ── */}
      {pack && (
        <div>

          {/* Pack header */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
            padding: "1.1rem 1.25rem",
            borderRadius: "16px",
            border: "1px solid var(--border-card)",
            background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.07) 0%, transparent 55%)",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase" as const,
                  color: "var(--accent)",
                  padding: "0.18rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgb(var(--accent-rgb) / 0.13)",
                }}>{pack.year_group}</span>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase" as const,
                  color: "var(--orange)",
                  padding: "0.18rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgba(255, 159, 67, 0.13)",
                }}>{pack.subject}</span>
              </div>
              <h2 style={{
                margin: 0,
                fontSize: "1.3rem",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                lineHeight: 1.2,
              }}>{pack.topic}</h2>
              {pack._meta?.autoSaved && (
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.78rem", color: "#4ade80", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" /></svg>
                  Auto-saved to your library
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              {!pack._meta?.autoSaved && saveState !== "saved" && (
                <button
                  type="button"
                  onClick={handleManualSave}
                  disabled={saveState === "saving"}
                  className="nav-btn-ghost"
                  style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem", opacity: saveState === "saving" ? 0.65 : 1, display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  {saveState === "saving" ? (
                    <>
                      <span style={{ width: "10px", height: "10px", border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.65s linear infinite" }} />
                      Saving…
                    </>
                  ) : "Save to Library"}
                </button>
              )}
              {(pack._meta?.autoSaved || saveState === "saved") && (
                <span style={{ fontSize: "0.8rem", color: "#4ade80", padding: "0.45rem 0", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" /></svg>
                  Saved to library
                </span>
              )}
              {saveState === "error" && saveMsg && (
                <span style={{ fontSize: "0.78rem", color: "#fc8181", padding: "0.45rem 0" }}>{saveMsg}</span>
              )}
              <button
                type="button"
                onClick={() => handleExport("printable-html")}
                className="nav-btn-ghost"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
              >Export Printable</button>
              <button
                type="button"
                onClick={() => handleExport("slides-json")}
                className="nav-btn-ghost"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
              >Export Slides</button>
              <button
                type="button"
                onClick={() => handleExport("worksheet-json")}
                className="nav-btn-ghost"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
              >Export Worksheet</button>
            </div>
          </div>

          {/* Sections */}
          <div style={{ display: "grid", gap: "1rem" }}>

            {/* Learning Objectives */}
            <div className="card">
              <SectionLabel>Learning Objectives</SectionLabel>
              <ol style={{ margin: 0, padding: "0 0 0 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pack.learning_objectives.map((obj, i) => (
                  <li key={i} style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text)" }}>{obj}</li>
                ))}
              </ol>
            </div>

            {/* Teacher + Pupil explanations */}
            <div className="grid two" style={{ gap: "1rem" }}>
              <div className="card">
                <SectionLabel>Teacher Explanation</SectionLabel>
                <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)" }}>{pack.teacher_explanation}</p>
              </div>
              <div className="card">
                <SectionLabel color="#60a5fa">Pupil Explanation</SectionLabel>
                <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)" }}>{pack.pupil_explanation}</p>
              </div>
            </div>

            {/* Worked Example */}
            <div className="card">
              <SectionLabel color="var(--orange)">Worked Example</SectionLabel>
              <div style={{
                background: "var(--field-bg)",
                borderRadius: "10px",
                padding: "1rem 1.1rem",
                fontSize: "0.87rem",
                lineHeight: 1.75,
                color: "var(--text)",
                whiteSpace: "pre-wrap" as const,
                fontFamily: "inherit",
                border: "1px solid rgba(255, 159, 67, 0.18)",
              }}>{pack.worked_example}</div>
            </div>

            {/* Common Misconceptions */}
            <div className="card">
              <SectionLabel color="#fc8181">Common Misconceptions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {pack.common_misconceptions.map((m, i) => (
                  <div key={i} style={{
                    display: "flex",
                    gap: "0.7rem",
                    alignItems: "flex-start",
                    padding: "0.65rem 0.9rem",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.065)",
                    border: "1px solid rgba(239, 68, 68, 0.13)",
                  }}>
                    <span style={{ color: "#fc8181", flexShrink: 0, marginTop: "1px", fontSize: "0.9rem" }}>⚠</span>
                    <span style={{ fontSize: "0.87rem", lineHeight: 1.55, color: "var(--text)" }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Differentiated Activities */}
            <div className="card">
              <SectionLabel>Differentiated Activities</SectionLabel>
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {(["support", "expected", "greater_depth"] as const).map((key) => {
                  const meta = {
                    support: { label: "Support", color: "#4ade80", bg: "rgba(34,197,94,0.065)", border: "rgba(34,197,94,0.14)" },
                    expected: { label: "Expected", color: "var(--accent)", bg: "rgb(var(--accent-rgb) / 0.065)", border: "rgb(var(--accent-rgb) / 0.16)" },
                    greater_depth: { label: "Greater Depth", color: "var(--orange)", bg: "rgba(255,159,67,0.065)", border: "rgba(255,159,67,0.16)" },
                  }[key];
                  return (
                    <div key={key} style={{
                      padding: "0.9rem",
                      borderRadius: "12px",
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                    }}>
                      <div style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        color: meta.color,
                        marginBottom: "0.55rem",
                      }}>{meta.label}</div>
                      <p style={{ margin: 0, fontSize: "0.87rem", lineHeight: 1.65, color: "var(--text)" }}>
                        {pack.activities[key]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEND Adaptations */}
            {pack.send_adaptations.length > 0 && (
              <div className="card">
                <SectionLabel color="#a78bfa">SEND Adaptations</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {pack.send_adaptations.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                      <span style={{ color: "#a78bfa", flexShrink: 0, fontSize: "0.7rem", marginTop: "4px" }}>◆</span>
                      <span style={{ fontSize: "0.87rem", lineHeight: 1.55, color: "var(--text)" }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plenary */}
            <div className="card">
              <SectionLabel>Plenary</SectionLabel>
              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)" }}>{pack.plenary}</p>
            </div>

            {/* Mini Assessment */}
            <div className="card">
              <SectionLabel color="#4ade80">Mini Assessment</SectionLabel>
              {pack.mini_assessment.questions.map((q, i) => (
                <RevealItem
                  key={i}
                  question={q}
                  answer={pack.mini_assessment.answers[i] ?? ""}
                  index={i}
                />
              ))}
            </div>

            {/* Slides */}
            {pack.slides.length > 0 && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <SectionLabel>Presentation Slides</SectionLabel>
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "999px",
                    background: "rgb(var(--accent-rgb) / 0.12)",
                    color: "var(--accent)",
                    fontWeight: 600,
                    marginBottom: "0.85rem",
                  }}>{pack.slides.length} slides</span>
                </div>
                <div style={{
                  display: "flex",
                  gap: "0.75rem",
                  overflowX: "auto",
                  paddingBottom: "0.5rem",
                  scrollbarWidth: "thin" as const,
                }}>
                  {pack.slides.map((slide, i) => (
                    <SlideCard key={i} slide={slide} index={i} />
                  ))}
                </div>
              </div>
            )}

          </div>{/* /sections */}

          {/* Export result */}
          {exportResult && (
            <div className="card" style={{ marginTop: "1.25rem" }}>
              <SectionLabel color="var(--muted)">Export Result</SectionLabel>
              <pre style={{
                margin: 0,
                fontSize: "0.77rem",
                color: "var(--muted)",
                overflowX: "auto",
                background: "var(--field-bg)",
                borderRadius: "8px",
                padding: "0.75rem",
                lineHeight: 1.55,
              }}>{JSON.stringify(exportResult, null, 2)}</pre>
            </div>
          )}

        </div>
      )}{/* /pack */}

    </main>
  );
}
