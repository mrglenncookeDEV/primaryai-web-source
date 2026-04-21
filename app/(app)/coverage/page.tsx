"use client";

import { useEffect, useState } from "react";

const YEAR_GROUPS = [
  { value: "year-1", label: "Year 1" },
  { value: "year-2", label: "Year 2" },
  { value: "year-3", label: "Year 3" },
  { value: "year-4", label: "Year 4" },
  { value: "year-5", label: "Year 5" },
  { value: "year-6", label: "Year 6" },
];

type ObjectiveItem = { id: string; code: string; description: string; taught: boolean };
type StrandGroup = { strand: string; total: number; taught: number; objectives: ObjectiveItem[] };
type SubjectGroup = { subject: string; total: number; taught: number; strands: StrandGroup[] };

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ flex: 1, height: "6px", borderRadius: "999px", background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 400ms ease" }} />
      </div>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color, minWidth: "36px", textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

const SUBJECT_COLORS: Record<string, string> = {
  English: "#3b82f6",
  Maths: "#8b5cf6",
  Science: "#10b981",
};

function subjectColor(s: string) {
  return SUBJECT_COLORS[s] ?? "#64748b";
}

export default function CoveragePage() {
  const [yearGroup, setYearGroup] = useState("year-3");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [coverage, setCoverage] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearGroup, from, to]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ yearGroup });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/nc-objectives/coverage?${params}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data?.coverage)) setCoverage(data.coverage);
    setLoading(false);
  }

  function toggleSubject(s: string) {
    setExpandedSubjects((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  }
  function toggleStrand(key: string) {
    setExpandedStrands((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  const totalTaught = coverage.reduce((s, subj) => s + subj.taught, 0);
  const totalAll    = coverage.reduce((s, subj) => s + subj.total, 0);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 0.25rem" }}>Curriculum Coverage</h1>
      <p style={{ margin: "0 0 1.5rem", color: "var(--muted)", fontSize: "0.88rem" }}>
        Track which National Curriculum objectives have been taught. Link objectives to lessons in the Timetable view.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
        <select
          value={yearGroup}
          onChange={(e) => setYearGroup(e.target.value)}
          style={{ padding: "0.4rem 0.7rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: "0.85rem", fontFamily: "inherit" }}
        >
          {YEAR_GROUPS.map((yg) => <option key={yg.value} value={yg.value}>{yg.label}</option>)}
        </select>
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: "0.82rem", fontFamily: "inherit" }} />
        </label>
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: "0.82rem", fontFamily: "inherit" }} />
        </label>
      </div>

      {/* Overall summary */}
      {!loading && coverage.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1rem 1.2rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>Overall Coverage</p>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>{totalTaught} of {totalAll} objectives taught</p>
          </div>
          <ProgressBar value={totalTaught} total={totalAll} color="#3b82f6" />
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {coverage.map((subj) => (
              <div key={subj.subject} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: subjectColor(subj.subject), flexShrink: 0 }} />
                <span style={{ color: "var(--muted)" }}>{subj.subject}:</span>
                <span style={{ fontWeight: 700, color: subjectColor(subj.subject) }}>{subj.taught}/{subj.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Loading coverage…</p>}

      {/* Subject breakdowns */}
      {coverage.map((subj) => {
        const color = subjectColor(subj.subject);
        const expanded = expandedSubjects.has(subj.subject);
        return (
          <div key={subj.subject} style={{ marginBottom: "1rem", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => toggleSubject(subj.subject)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1.1rem", background: "var(--surface)", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
            >
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1, color: "var(--fg)" }}>{subj.subject}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{subj.taught}/{subj.total} taught</span>
              <div style={{ width: "80px" }}>
                <ProgressBar value={subj.taught} total={subj.total} color={color} />
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 200ms", flexShrink: 0, color: "var(--muted)" }}>
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </button>

            {expanded && (
              <div style={{ padding: "0 0 0.75rem" }}>
                {subj.strands.map((strand) => {
                  const strandKey = `${subj.subject}:${strand.strand}`;
                  const strandExpanded = expandedStrands.has(strandKey);
                  return (
                    <div key={strand.strand}>
                      <button
                        type="button"
                        onClick={() => toggleStrand(strandKey)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.55rem 1.1rem 0.55rem 1.4rem", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", borderTop: "1px solid var(--border)" }}
                      >
                        <span style={{ flex: 1, fontSize: "0.83rem", fontWeight: 600, color: "var(--fg)" }}>{strand.strand}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{strand.taught}/{strand.total}</span>
                        <div style={{ width: "60px" }}>
                          <ProgressBar value={strand.taught} total={strand.total} color={color} />
                        </div>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: strandExpanded ? "rotate(180deg)" : "none", transition: "transform 200ms", flexShrink: 0, color: "var(--muted)" }}>
                          <path d="M2 4l4 4 4-4"/>
                        </svg>
                      </button>
                      {strandExpanded && (
                        <div style={{ padding: "0.25rem 1.1rem 0.25rem 1.8rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {strand.objectives.map((obj) => (
                            <div key={obj.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.35rem 0" }}>
                              <span style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "1px" }}>{obj.taught ? "✅" : "⬜"}</span>
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, color, whiteSpace: "nowrap", marginTop: "2px" }}>{obj.code}</span>
                              <span style={{ fontSize: "0.78rem", color: obj.taught ? "var(--fg)" : "var(--muted)", lineHeight: 1.45 }}>{obj.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!loading && coverage.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📚</p>
          <p style={{ fontWeight: 600 }}>No objectives found for {YEAR_GROUPS.find((y) => y.value === yearGroup)?.label ?? yearGroup}</p>
          <p style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>Run migration 037_nc_objectives.sql and 037a_nc_objectives_seed.sql to populate the objectives.</p>
        </div>
      )}
    </div>
  );
}
