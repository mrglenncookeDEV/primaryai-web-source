"use client";

import { useState, useCallback } from "react";

interface RetrievalQuestion {
  type: string;
  question: string;
  options?: string[];
  answer: string;
  rationale: string;
}

interface RetrievalResult {
  questions: RetrievalQuestion[];
  curriculumAnchor: string;
  spacingNote: string;
}

type QuestionType = "multiple_choice" | "short_answer" | "true_false" | "fill_blank";

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  true_false: "True / False",
  fill_blank: "Fill in the blank",
};

const ALL_TYPES: QuestionType[] = ["multiple_choice", "short_answer", "true_false", "fill_blank"];
const YEAR_GROUPS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const SUBJECTS = [
  "English — Reading", "English — Writing", "English — SPAG",
  "Maths", "Science",
  "History", "Geography", "Art & Design", "Design & Technology",
  "Computing", "Music", "RE", "PSHE", "MFL",
];

export default function RetrievalPage() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [yearGroup, setYearGroup] = useState("");
  const [subject, setSubject] = useState("");
  const [priorTopic, setPriorTopic] = useState("");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["short_answer", "multiple_choice"]);
  const [questionCount, setQuestionCount] = useState(6);

  // ── Result state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [copied, setCopied] = useState(false);

  function toggleType(t: QuestionType) {
    setQuestionTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (questionTypes.length === 0) {
      setError("Please select at least one question type.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAnswers(false);
    setCopied(false);

    try {
      const res = await fetch("/api/retrieval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearGroup, subject, priorTopic, questionTypes, questionCount }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Something went wrong — please try again.");
        return;
      }

      const data: RetrievalResult = await res.json();
      setResult(data);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [yearGroup, subject, priorTopic, questionTypes, questionCount]);

  function copyQuestions() {
    if (!result) return;
    const lines: string[] = [];
    result.questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.question}`);
      if (q.options) q.options.forEach((opt, j) => lines.push(`   ${String.fromCharCode(65 + j)}) ${opt}`));
      lines.push("");
    });
    lines.push("Answers:");
    result.questions.forEach((q, i) => lines.push(`${i + 1}. ${q.answer}`));
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const canSubmit = !loading && priorTopic.trim().length > 0 && questionTypes.length > 0;

  return (
    <main className="page-wrap" style={{ maxWidth: result ? "1140px" : "720px", transition: "max-width 300ms ease" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.55rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Retrieval Practice
        </h1>
        <p style={{ margin: 0, fontSize: "0.87rem", color: "var(--muted)", lineHeight: 1.55, maxWidth: "520px" }}>
          Generate curriculum-aligned questions on prior learning. Vary the format, toggle the mark scheme, then paste straight into your lesson.
        </p>
      </div>

      {/* ── Main layout: form left, output right ─────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: result ? "minmax(0,1fr) minmax(0,1fr)" : "1fr",
        gap: "1.25rem",
        alignItems: "start",
      }}>

        {/* ── Input panel ──────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Context */}
          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p className="scheduler-modal-label" style={{ margin: 0 }}>Prior learning</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
              <div className="scheduler-modal-field">
                <label className="scheduler-modal-label">Year group</label>
                <select className="scheduler-modal-input" value={yearGroup} onChange={e => setYearGroup(e.target.value)}>
                  <option value="">Any</option>
                  {YEAR_GROUPS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="scheduler-modal-field">
                <label className="scheduler-modal-label">Subject</label>
                <select className="scheduler-modal-input" value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="">Any</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="scheduler-modal-field">
              <label className="scheduler-modal-label">What prior topic should pupils retrieve?</label>
              <input
                className="scheduler-modal-input"
                value={priorTopic}
                onChange={e => setPriorTopic(e.target.value)}
                placeholder="e.g. identifying features of a non-chronological report — Year 4 Autumn Term"
                required
              />
            </div>
          </div>

          {/* Question settings */}
          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p className="scheduler-modal-label" style={{ margin: 0 }}>Question settings</p>

            <div className="scheduler-modal-field">
              <label className="scheduler-modal-label">Question types</label>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                {ALL_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    style={{
                      padding: "0.3rem 0.8rem",
                      borderRadius: "6px",
                      border: `1px solid ${questionTypes.includes(t) ? "var(--accent)" : "var(--border)"}`,
                      background: questionTypes.includes(t) ? "rgb(var(--accent-rgb) / 0.1)" : "transparent",
                      color: questionTypes.includes(t) ? "var(--accent)" : "var(--muted)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="scheduler-modal-label">Questions</span>
              {[3, 5, 6, 8, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  style={{
                    width: "36px",
                    height: "30px",
                    borderRadius: "6px",
                    border: `1px solid ${questionCount === n ? "var(--accent)" : "var(--border)"}`,
                    background: questionCount === n ? "rgb(var(--accent-rgb) / 0.1)" : "transparent",
                    color: questionCount === n ? "var(--accent)" : "var(--muted)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#ef4444", padding: "0.65rem 0.85rem", borderRadius: "8px", background: "rgb(239 68 68 / 0.07)", border: "1px solid rgb(239 68 68 / 0.2)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "0.7rem 1.5rem",
              borderRadius: "10px",
              border: "none",
              background: canSubmit ? "var(--accent)" : "var(--border)",
              color: canSubmit ? "var(--accent-text)" : "var(--muted)",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              alignSelf: "flex-start",
              transition: "background 150ms",
            }}
          >
            {loading && (
              <span style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "var(--accent-text)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
            )}
            {loading ? "Generating…" : result ? "Regenerate" : `Generate ${questionCount} questions`}
          </button>
        </form>

        {/* ── Output panel ─────────────────────────────────────────────────── */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
                {result.questions.length} questions generated
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAnswers(s => !s)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: showAnswers ? "rgb(var(--accent-rgb) / 0.1)" : "var(--surface)",
                    color: showAnswers ? "var(--accent)" : "var(--text)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {showAnswers ? "Hide answers" : "Show answers"}
                </button>
                <button
                  type="button"
                  onClick={copyQuestions}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: copied ? "rgb(var(--accent-rgb) / 0.12)" : "var(--surface)",
                    color: copied ? "var(--accent)" : "var(--text)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {copied ? "Copied ✓" : "Copy all"}
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="card" style={{ padding: "1.1rem 1.25rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {result.questions.map((q, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", paddingTop: "0.15rem", minWidth: "18px" }}>{i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {TYPE_LABELS[q.type as QuestionType] ?? q.type}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 0.4rem", fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.55, fontWeight: 500 }}>{q.question}</p>

                        {q.options && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.35rem" }}>
                            {q.options.map((opt, j) => (
                              <div key={j} style={{ display: "flex", gap: "0.45rem", alignItems: "baseline" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", flexShrink: 0 }}>{String.fromCharCode(65 + j)})</span>
                                <span style={{ fontSize: "0.83rem", color: "var(--text)" }}>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {showAnswers && (
                          <div style={{ marginTop: "0.4rem", padding: "0.4rem 0.7rem", borderRadius: "6px", background: "rgb(16 185 129 / 0.07)", border: "1px solid rgb(16 185 129 / 0.2)", display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Answer</span>
                            <span style={{ fontSize: "0.82rem", color: "var(--text)" }}>{q.answer}</span>
                          </div>
                        )}

                        {q.rationale && (
                          <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.45, fontStyle: "italic" }}>{q.rationale}</p>
                        )}
                      </div>
                    </div>
                    {i < result.questions.length - 1 && (
                      <div style={{ marginTop: "1.1rem", borderTop: "1px solid var(--border)" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum anchor + spacing note */}
            <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <p style={{ margin: "0 0 0.2rem", fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Curriculum anchor</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5 }}>{result.curriculumAnchor}</p>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <p style={{ margin: "0 0 0.2rem", fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Spacing note</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5 }}>{result.spacingNote}</p>
                </div>
              </div>
            </div>

            {/* Fine print */}
            <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Check questions for accuracy before use. Professional responsibility for all content decisions remains with the teacher.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
