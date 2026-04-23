"use client";

import { useState, useCallback } from "react";

interface CriterionFeedback {
  criterion: string;
  comment: string;
  strength: boolean;
}

interface MarkingResult {
  criterionFeedback: CriterionFeedback[];
  overallComment: string;
  nextSteps: string[];
  warningLabel: string;
}

const YEAR_GROUPS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const SUBJECTS = [
  "English — Reading", "English — Writing", "English — SPAG",
  "Maths", "Science",
  "History", "Geography", "Art & Design", "Design & Technology",
  "Computing", "Music", "RE", "PSHE", "MFL",
];

export default function MarkingPage() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [yearGroup, setYearGroup] = useState("");
  const [subject, setSubject] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [pupilWork, setPupilWork] = useState("");
  const [markingCriteria, setMarkingCriteria] = useState("");
  const [markingStyle, setMarkingStyle] = useState<"formative" | "summative">("formative");

  // ── Result state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [editedComments, setEditedComments] = useState<Record<number, string>>({});
  const [editedOverall, setEditedOverall] = useState("");
  const [editedNextSteps, setEditedNextSteps] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setEditedComments({});
    setEditedOverall("");
    setEditedNextSteps([]);
    setCopied(false);

    try {
      const res = await fetch("/api/marking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearGroup, subject, assignmentDescription, pupilWork, markingCriteria, markingStyle }),
      });

      if (res.status === 422) {
        setError("This content has been flagged. Please speak with your Designated Safeguarding Lead (DSL).");
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Something went wrong — please try again.");
        return;
      }

      const data: MarkingResult = await res.json();
      setResult(data);
      setEditedOverall(data.overallComment);
      setEditedNextSteps(data.nextSteps.slice());
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [yearGroup, subject, assignmentDescription, pupilWork, markingCriteria, markingStyle]);

  function buildFeedbackText() {
    if (!result) return "";
    const lines: string[] = [];
    result.criterionFeedback.forEach((cf, i) => {
      lines.push(`${cf.criterion}`);
      lines.push(editedComments[i] ?? cf.comment);
      lines.push("");
    });
    lines.push(editedOverall || result.overallComment);
    lines.push("");
    lines.push("Next steps:");
    (editedNextSteps.length ? editedNextSteps : result.nextSteps).forEach(s => lines.push(`• ${s}`));
    return lines.join("\n");
  }

  function copyFeedback() {
    navigator.clipboard.writeText(buildFeedbackText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const canSubmit = !loading && pupilWork.trim().length > 0 && assignmentDescription.trim().length > 0;

  return (
    <main className="page-wrap" style={{ maxWidth: result ? "1140px" : "720px", transition: "max-width 300ms ease" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.55rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Marking
        </h1>
        <p style={{ margin: 0, fontSize: "0.87rem", color: "var(--muted)", lineHeight: 1.55, maxWidth: "520px" }}>
          Paste anonymised pupil work and your criteria. Review and edit every line before it reaches a pupil — the professional judgement is yours.
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
            <p className="scheduler-modal-label" style={{ margin: 0 }}>Task context</p>

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
              <label className="scheduler-modal-label">What was the task?</label>
              <textarea
                className="scheduler-modal-input"
                style={{ resize: "vertical", minHeight: "60px", lineHeight: 1.5 }}
                value={assignmentDescription}
                onChange={e => setAssignmentDescription(e.target.value)}
                placeholder="e.g. Write a newspaper report about a historical event using subheadings, quotes, and formal language."
                required
              />
            </div>

            <div className="scheduler-modal-field">
              <label className="scheduler-modal-label">Marking criteria</label>
              <textarea
                className="scheduler-modal-input"
                style={{ resize: "vertical", minHeight: "52px", lineHeight: 1.5 }}
                value={markingCriteria}
                onChange={e => setMarkingCriteria(e.target.value)}
                placeholder="e.g. formal language, text organisation, punctuation, factual accuracy"
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="scheduler-modal-label">Style</span>
              {(["formative", "summative"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMarkingStyle(s)}
                  style={{
                    padding: "0.3rem 0.8rem",
                    borderRadius: "6px",
                    border: `1px solid ${markingStyle === s ? "var(--accent)" : "var(--border)"}`,
                    background: markingStyle === s ? "rgb(var(--accent-rgb) / 0.1)" : "transparent",
                    color: markingStyle === s ? "var(--accent)" : "var(--muted)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pupil work */}
          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p className="scheduler-modal-label" style={{ margin: 0 }}>Pupil work</p>
              <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Do not include the pupil&rsquo;s name</span>
            </div>
            <textarea
              className="scheduler-modal-input"
              style={{ resize: "vertical", minHeight: "180px", lineHeight: 1.6, fontSize: "0.85rem" }}
              value={pupilWork}
              onChange={e => setPupilWork(e.target.value)}
              placeholder="Paste the pupil's work here…"
              required
            />
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
            {loading ? "Generating…" : result ? "Regenerate" : "Generate feedback"}
          </button>
        </form>

        {/* ── Output panel ─────────────────────────────────────────────────── */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
                Draft feedback — edit before use
              </p>
              <button
                type="button"
                onClick={copyFeedback}
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

            {/* Criterion feedback */}
            {result.criterionFeedback.length > 0 && (
              <div className="card" style={{ padding: "1.1rem 1.25rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {result.criterionFeedback.map((cf, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <span style={{
                          width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                          background: cf.strength ? "#22c55e" : "#f59e0b",
                        }} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", letterSpacing: "0.01em" }}>{cf.criterion}</span>
                        <span style={{ fontSize: "0.65rem", color: cf.strength ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
                          {cf.strength ? "strength" : "development"}
                        </span>
                      </div>
                      <textarea
                        className="scheduler-modal-input"
                        style={{ resize: "vertical", minHeight: "52px", lineHeight: 1.55, fontSize: "0.83rem" }}
                        value={editedComments[i] ?? cf.comment}
                        onChange={e => setEditedComments(prev => ({ ...prev, [i]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall comment */}
            <div className="card" style={{ padding: "1.1rem 1.25rem", marginBottom: "0.75rem" }}>
              <p className="scheduler-modal-label" style={{ margin: "0 0 0.5rem" }}>Overall comment</p>
              <textarea
                className="scheduler-modal-input"
                style={{ resize: "vertical", minHeight: "100px", lineHeight: 1.6, fontSize: "0.85rem" }}
                value={editedOverall}
                onChange={e => setEditedOverall(e.target.value)}
              />
            </div>

            {/* Next steps */}
            <div className="card" style={{ padding: "1.1rem 1.25rem", marginBottom: "0.75rem" }}>
              <p className="scheduler-modal-label" style={{ margin: "0 0 0.6rem" }}>Next steps</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {(editedNextSteps.length ? editedNextSteps : result.nextSteps).map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, paddingTop: "0.45rem", flexShrink: 0 }}>{i + 1}.</span>
                    <input
                      className="scheduler-modal-input"
                      style={{ flex: 1 }}
                      value={step}
                      onChange={e => {
                        const next = [...(editedNextSteps.length ? editedNextSteps : result.nextSteps)];
                        next[i] = e.target.value;
                        setEditedNextSteps(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Fine print */}
            <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Review every line before using with pupils. Professional responsibility for all marking decisions remains with the teacher.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
