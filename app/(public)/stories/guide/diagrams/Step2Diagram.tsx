const C = {
  bg: "#07101c", surface: "#0d1a2e", border: "#1a3050",
  accent: "#b5c8e8", accentDark: "#071428", text: "#f0f4fb",
  muted: "#7a90ab", field: "#050e18", btn: "#1a3050",
  chrome: "#0a1628", green: "#4ade80",
};

const STEP_XS = [64, 176, 288, 400, 512];
const LABELS = ["Who", "What", "Why", "Criteria", "Review"];

export default function Step2Diagram() {
  return (
    <figure style={{ margin: 0 }}>
      <div style={{
        background: C.chrome, borderRadius: "10px 10px 0 0",
        padding: "0 12px", height: 36, display: "flex", alignItems: "center", gap: 6,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
        <div style={{
          flex: 1, background: C.field, borderRadius: 5, height: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: C.muted,
        }}>
          primaryai.org.uk/stories
        </div>
      </div>
      <svg
        viewBox="0 0 640 310"
        width="100%"
        role="img"
        aria-labelledby="diag-step2-title"
        style={{ display: "block", background: C.bg, borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none" }}
      >
        <title id="diag-step2-title">Step 2 of the Story Builder: describing what the user wants to do, with step 1 marked complete</title>

        {/* Step tracker */}
        <rect x="20" y="14" width="600" height="60" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
        {STEP_XS.map((x, i) => {
          const done = i === 0;
          const active = i === 1;
          return (
            <g key={i}>
              <circle cx={x} cy={32} r={12}
                fill={active ? C.accent : done ? C.green : C.btn}
                stroke={active ? C.accent : done ? C.green : C.border}
                strokeWidth="1.5" />
              {done ? (
                <path d={`M${x - 5},32 L${x - 1},36 L${x + 5},28`}
                  stroke={C.accentDark} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <text x={x} y={36} fill={active ? C.accentDark : C.muted} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{i + 1}</text>
              )}
              <text x={x} y={58} fill={active ? C.accent : done ? C.green : C.muted} fontSize="9" textAnchor="middle" fontFamily="sans-serif">{LABELS[i]}</text>
              {i < 4 && <line x1={x + 13} y1={32} x2={STEP_XS[i + 1] - 13} y2={32} stroke={done ? C.green : C.border} strokeWidth="1.5" />}
            </g>
          );
        })}

        {/* Card */}
        <rect x="20" y="88" width="600" height="206" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />

        <text x="44" y="114" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">WHAT DO THEY WANT TO DO?</text>
        <text x="44" y="138" fill={C.accent} fontSize="13" fontWeight="700" fontFamily="sans-serif">I want to</text>
        <text x="122" y="138" fill={C.muted} fontSize="12" fontFamily="sans-serif">— pick a goal or describe the task</text>

        {/* Chips */}
        {[
          { label: "create lesson plans", x: 44, selected: false },
          { label: "track pupil progress", x: 188, selected: true },
          { label: "generate resources", x: 342, selected: false },
          { label: "plan a unit of work", x: 478, selected: false },
        ].map(({ label, x, selected }) => {
          const w = label.length * 6.8 + 20;
          return (
            <g key={label}>
              <rect rx={12} ry={12} x={x} y={150} width={w} height={24}
                fill={selected ? C.accent : "transparent"}
                stroke={selected ? C.accent : C.border}
                strokeWidth={selected ? 2 : 1.5} />
              <text x={x + w / 2} y={166} fill={selected ? C.accentDark : C.muted}
                fontSize="10" fontWeight={selected ? "700" : "400"} textAnchor="middle" fontFamily="sans-serif">
                {label}
              </text>
            </g>
          );
        })}
        {[
          { label: "save and reuse materials", x: 44 },
          { label: "differentiate activities", x: 204 },
          { label: "export progress reports", x: 364 },
        ].map(({ label, x }) => {
          const w = label.length * 6.8 + 20;
          return (
            <g key={label}>
              <rect rx={12} ry={12} x={x} y={180} width={w} height={24}
                fill="transparent" stroke={C.border} strokeWidth="1.5" />
              <text x={x + w / 2} y={196} fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">{label}</text>
            </g>
          );
        })}

        {/* Input */}
        <rect x="44" y="216" width="552" height="36" rx="8" fill={C.field} stroke={C.border} strokeWidth="1.5" />
        <text x="60" y="239" fill={C.muted} opacity="0.5" fontSize="11" fontFamily="sans-serif">e.g. automatically generate a differentiated lesson plan for three ability groups…</text>

        {/* Buttons */}
        <rect x="44" y="264" width="90" height="28" rx="8" fill="transparent" stroke={C.border} strokeWidth="1.5" />
        <text x="89" y="282" fill={C.muted} fontSize="11" textAnchor="middle" fontFamily="sans-serif">← Back</text>
        <rect x="506" y="264" width="90" height="28" rx="8" fill={C.accent} />
        <text x="551" y="282" fill={C.accentDark} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Next →</text>
      </svg>
      <figcaption style={{ fontSize: "0.75rem", color: "#7a90ab", textAlign: "center", marginTop: "0.5rem" }}>
        Step 2 — Step 1 is complete (green ✓). Describe what the user wants to achieve.
      </figcaption>
    </figure>
  );
}
