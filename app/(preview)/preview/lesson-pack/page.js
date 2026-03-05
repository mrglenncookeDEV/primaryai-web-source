"use client";

const PACK = {
  yearGroup: "Year 4",
  subject: "Maths",
  topic: "Fractions",
  objectives: [
    "Recognise and show equivalent fractions using diagrams and number lines",
    "Add and subtract fractions with the same denominator",
    "Solve problems involving fractions of quantities",
  ],
  teacherNote: "Begin with concrete resources — use fraction walls and circles before moving to abstract notation. Emphasise that the denominator tells us how many equal parts the whole is divided into.",
  activities: {
    support: "Match fraction cards to shaded diagrams. Use fraction walls to compare ¼, ½, and ¾.",
    expected: "Order fractions on a number line. Add and subtract fractions with the same denominator using bar models.",
    depth: "Investigate which fractions are equivalent to ½. Explain reasoning using at least two different representations.",
  },
  questions: [
    "What is ⅜ + ⅜?",
    "Write two fractions equivalent to ½.",
    "A pizza is cut into 8 slices. Sam eats 3 slices. What fraction is left?",
  ],
};

const ACCENT = "var(--accent)";

function SectionHead({ children, color = ACCENT }) {
  return (
    <div style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color, marginBottom: "0.5rem" }}>
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border-card)", borderRadius: 14, padding: "0.85rem 1rem", ...style }}>
      {children}
    </div>
  );
}

export default function LessonPackPreview() {
  return (
    <div style={{ width: 390, height: 844, overflow: "hidden", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit", display: "flex", flexDirection: "column" }}>

      {/* ── Status bar simulation ──────────────────────────────────── */}
      <div style={{ height: 44, minHeight: 44, background: "var(--nav-bg)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.2rem", fontSize: "0.7rem", fontWeight: 600, color: "var(--text)" }}>
        <span>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 7l4-4 16 16-4 4-16-16zm5 5l10 10-4 4L2 16l4-4z" opacity="0"/><path d="M2 9.5c2.76-2.76 7.24-2.76 10 0L10.5 11c-1.95-1.95-5.05-1.95-7 0L2 9.5z"/><path d="M5 12.5c1.38-1.38 3.62-1.38 5 0L8.5 14c-.69-.69-1.81-.69-2.5 0L5 12.5z"/><circle cx="10" cy="16.5" r="1.5"/></svg>
          <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>●●●●</span>
        </div>
      </div>

      {/* ── Mini nav ──────────────────────────────────────────────── */}
      <div style={{ height: 52, minHeight: 52, background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.6rem" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10">
          <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5" stroke="var(--orange)" strokeWidth="1.7" />
          <path d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
          Pr<span style={{ color: "var(--orange)" }}>i</span>m<span style={{ color: "var(--orange)" }}>a</span>ry<span style={{ color: "var(--orange)" }}>A</span><span style={{ color: "var(--orange)" }}>I</span>
        </span>
      </div>

      {/* ── Scrollable content ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>

        {/* Pack header */}
        <div style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.18), rgb(var(--accent-rgb) / 0.06))", border: "1px solid rgb(var(--accent-rgb) / 0.25)", borderRadius: 16, padding: "1rem 1.1rem" }}>
          <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, background: "rgb(var(--accent-rgb) / 0.18)", color: "var(--accent)", borderRadius: 6, padding: "0.15rem 0.5rem" }}>{PACK.yearGroup}</span>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, background: "rgb(var(--accent-rgb) / 0.12)", color: "var(--accent)", borderRadius: 6, padding: "0.15rem 0.5rem" }}>{PACK.subject}</span>
          </div>
          <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{PACK.topic}</h2>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>Generated lesson pack</p>
        </div>

        {/* Learning objectives */}
        <Card>
          <SectionHead>Learning Objectives</SectionHead>
          {PACK.objectives.map((obj, i) => (
            <div key={i} style={{ display: "flex", gap: "0.6rem", marginBottom: i < PACK.objectives.length - 1 ? "0.5rem" : 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgb(var(--accent-rgb) / 0.14)", color: "var(--accent)", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text)" }}>{obj}</p>
            </div>
          ))}
        </Card>

        {/* Teacher note */}
        <Card style={{ borderLeft: `3px solid var(--accent)` }}>
          <SectionHead>Teacher Explanation</SectionHead>
          <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.6, color: "var(--text)" }}>{PACK.teacherNote}</p>
        </Card>

        {/* Activities */}
        <Card>
          <SectionHead>Differentiated Activities</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {[
              { tier: "Support", content: PACK.activities.support, color: "#7ba7c9" },
              { tier: "Expected", content: PACK.activities.expected, color: "var(--accent)" },
              { tier: "Greater Depth", content: PACK.activities.depth, color: "#8878b8" },
            ].map(({ tier, content, color }) => (
              <div key={tier} style={{ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 10, padding: "0.6rem 0.75rem" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{tier}</div>
                <p style={{ margin: 0, fontSize: "0.75rem", lineHeight: 1.55, color: "var(--text)" }}>{content}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Mini assessment */}
        <Card>
          <SectionHead>Mini Assessment</SectionHead>
          {PACK.questions.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: "0.6rem", marginBottom: i < PACK.questions.length - 1 ? "0.6rem" : 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgb(var(--accent-rgb) / 0.14)", color: "var(--accent)", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>Q{i + 1}</div>
              <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text)" }}>{q}</p>
            </div>
          ))}
        </Card>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button style={{ flex: 1, background: "rgb(var(--accent-rgb) / 0.12)", color: "var(--accent)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", borderRadius: 10, padding: "0.65rem", fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit", cursor: "default" }}>Save to Library</button>
          <button style={{ flex: 1, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "0.65rem", fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit", cursor: "default" }}>Schedule Lesson</button>
        </div>

        <div style={{ height: "1rem" }} />
      </div>
    </div>
  );
}
