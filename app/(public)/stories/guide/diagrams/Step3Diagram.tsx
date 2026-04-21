const C = {
  bg: "#07101c", surface: "#0d1a2e", border: "#1a3050",
  accent: "#b5c8e8", accentDark: "#071428", text: "#f0f4fb",
  muted: "#7a90ab", field: "#050e18", btn: "#1a3050",
  chrome: "#0a1628", green: "#4ade80",
  red: "#ef4444", orange: "#f97316", blue: "#3b82f6", gray: "#6b7280",
};

const STEP_XS = [64, 176, 288, 400, 512];
const LABELS = ["Who", "What", "Why", "Criteria", "Review"];

export default function Step3Diagram() {
  const moscow = [
    { label: "Must have", sub: "Critical for launch", color: C.red, x: 44, y: 166 },
    { label: "Should have", sub: "Important, not blocking", color: C.orange, x: 212, y: 166 },
    { label: "Could have", sub: "Nice to have", color: C.blue, x: 380, y: 166, selected: true },
    { label: "Won't have", sub: "Out of scope", color: C.gray, x: 548, y: 166 },
  ];
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
        viewBox="0 0 640 380"
        width="100%"
        role="img"
        aria-labelledby="diag-step3-title"
        style={{ display: "block", background: C.bg, borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none" }}
      >
        <title id="diag-step3-title">Step 3: setting the why, MoSCoW priority, and effort estimate</title>

        {/* Step tracker */}
        <rect x="20" y="14" width="600" height="60" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
        {STEP_XS.map((x, i) => {
          const done = i < 2;
          const active = i === 2;
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
        <rect x="20" y="88" width="600" height="272" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />

        {/* Why section */}
        <text x="44" y="112" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">SO THAT...</text>
        <rect x="44" y="118" width="552" height="32" rx="7" fill={C.field} stroke={C.border} strokeWidth="1.5" />
        <text x="60" y="139" fill={C.text} fontSize="11" fontFamily="sans-serif">reduce weekly planning from 4 hours to under 1 hour</text>

        {/* Divider */}
        <line x1="44" y1="160" x2="596" y2="160" stroke={C.border} strokeWidth="1" />

        {/* MoSCoW section */}
        <text x="44" y="178" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">PRIORITY (MOSCOW)</text>
        {moscow.map(({ label, sub, color, x, y, selected }) => (
          <g key={label}>
            <rect x={x} y={y} width={158} height={58} rx="8"
              fill={selected ? `${color}22` : "transparent"}
              stroke={selected ? color : C.border}
              strokeWidth={selected ? 2 : 1.5} />
            <text x={x + 12} y={y + 20} fill={selected ? color : C.muted} fontSize="11" fontWeight="700" fontFamily="sans-serif">{label}</text>
            <text x={x + 12} y={y + 36} fill={C.muted} fontSize="9" fontFamily="sans-serif">{sub}</text>
            {selected && <text x={x + 138} y={y + 20} fill={color} fontSize="14" textAnchor="middle" fontFamily="sans-serif">✓</text>}
          </g>
        ))}

        {/* Divider */}
        <line x1="44" y1="236" x2="596" y2="236" stroke={C.border} strokeWidth="1" />

        {/* Effort section */}
        <text x="44" y="254" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">EFFORT ESTIMATE</text>
        {[
          { label: "Small", x: 44 },
          { label: "Medium", x: 122, selected: true },
          { label: "Large", x: 218 },
          { label: "Not sure", x: 290 },
        ].map(({ label, x, selected }) => {
          const w = label.length * 7.5 + 20;
          return (
            <g key={label}>
              <rect rx={12} ry={12} x={x} y={262} width={w} height={24}
                fill={selected ? C.accent : "transparent"}
                stroke={selected ? C.accent : C.border}
                strokeWidth={selected ? 2 : 1.5} />
              <text x={x + w / 2} y={278} fill={selected ? C.accentDark : C.muted}
                fontSize="10" fontWeight={selected ? "700" : "400"} textAnchor="middle" fontFamily="sans-serif">
                {label}
              </text>
            </g>
          );
        })}

        {/* Buttons */}
        <rect x="44" y="308" width="90" height="28" rx="8" fill="transparent" stroke={C.border} strokeWidth="1.5" />
        <text x="89" y="326" fill={C.muted} fontSize="11" textAnchor="middle" fontFamily="sans-serif">← Back</text>
        <rect x="506" y="308" width="90" height="28" rx="8" fill={C.accent} />
        <text x="551" y="326" fill={C.accentDark} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Next →</text>
      </svg>
      <figcaption style={{ fontSize: "0.75rem", color: "#7a90ab", textAlign: "center", marginTop: "0.5rem" }}>
        Step 3 — Set the benefit, pick a MoSCoW priority (Could have selected), and estimate effort.
      </figcaption>
    </figure>
  );
}
