const C = {
  bg: "#07101c", surface: "#0d1a2e", border: "#1a3050",
  accent: "#b5c8e8", accentDark: "#071428", text: "#f0f4fb",
  muted: "#7a90ab", field: "#050e18", btn: "#1a3050",
  chrome: "#0a1628", green: "#4ade80",
};

function StepDot({ x, done, active }: { x: number; done?: boolean; active?: boolean }) {
  const fill = active ? C.accent : done ? C.green : C.btn;
  const textFill = active || done ? C.accentDark : C.muted;
  return (
    <g>
      <circle cx={x} cy={32} r={12} fill={fill} stroke={active ? C.accent : done ? C.green : C.border} strokeWidth="1.5" />
      {done ? (
        <path d={`M${x - 5},32 L${x - 1},36 L${x + 5},28`} stroke={textFill} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <text x={x} y={36} fill={textFill} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
          {active ? "1" : "2"}
        </text>
      )}
    </g>
  );
}

export default function Step1Diagram() {
  const steps = [
    { label: "Who", active: true },
    { label: "What", active: false },
    { label: "Why", active: false },
    { label: "Criteria", active: false },
    { label: "Review", active: false },
  ];
  const stepXs = [64, 176, 288, 400, 512];
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
        viewBox="0 0 640 320"
        width="100%"
        role="img"
        aria-labelledby="diag-step1-title"
        style={{ display: "block", background: C.bg, borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none" }}
      >
        <title id="diag-step1-title">Step 1 of the Story Builder: selecting a user role from chips or typing a custom role</title>

        {/* Step tracker */}
        <rect x="20" y="14" width="600" height="60" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
        {stepXs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={32} r={12}
              fill={i === 0 ? C.accent : C.btn}
              stroke={i === 0 ? C.accent : C.border}
              strokeWidth="1.5"
            />
            {i === 0 ? (
              <text x={x} y={36} fill={C.accentDark} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">1</text>
            ) : (
              <text x={x} y={36} fill={C.muted} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{i + 1}</text>
            )}
            <text x={x} y={58} fill={i === 0 ? C.accent : C.muted} fontSize="9" textAnchor="middle" fontFamily="sans-serif">
              {steps[i].label}
            </text>
            {i < 4 && <line x1={x + 13} y1={32} x2={stepXs[i + 1] - 13} y2={32} stroke={C.border} strokeWidth="1.5" />}
          </g>
        ))}
        {/* Active step glow */}
        <circle cx={stepXs[0]} cy={32} r={17} fill="none" stroke={C.accent} strokeWidth="1" opacity="0.3" />

        {/* Card */}
        <rect x="20" y="88" width="600" height="216" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />

        {/* Section title */}
        <text x="44" y="116" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">WHO IS THE USER?</text>

        {/* Story prefix */}
        <text x="44" y="140" fill={C.accent} fontSize="13" fontWeight="700" fontFamily="sans-serif">As a</text>
        <text x="92" y="140" fill={C.muted} fontSize="12" fontFamily="sans-serif">— select a role below or type your own</text>

        {/* Chips */}
        {[
          { label: "Teacher", x: 44, selected: false },
          { label: "Teaching Asst.", x: 116, selected: false },
          { label: "Subject Lead", x: 244, selected: false },
          { label: "SENCO", x: 364, selected: true },
          { label: "Head Teacher", x: 432, selected: false },
        ].map(({ label, x, selected }) => {
          const w = label.length * 7 + 20;
          return (
            <g key={label}>
              <rect rx={12} ry={12} x={x} y={153} width={w} height={24}
                fill={selected ? C.accent : "transparent"}
                stroke={selected ? C.accent : C.border}
                strokeWidth={selected ? 2 : 1.5}
              />
              <text x={x + w / 2} y={169} fill={selected ? C.accentDark : C.muted}
                fontSize="10" fontWeight={selected ? "700" : "400"} textAnchor="middle" fontFamily="sans-serif">
                {label}
              </text>
            </g>
          );
        })}

        {/* Annotation: selected chip */}
        <path d="M 387 152 Q 387 128 420 120" fill="none" stroke={C.green} strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#arr1)" />
        <defs>
          <marker id="arr1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.green} />
          </marker>
        </defs>
        <text x="430" y="116" fill={C.green} fontSize="10" fontFamily="sans-serif">Selected ✓</text>

        {/* Input */}
        <rect x="44" y="190" width="552" height="36" rx="8" fill={C.field} stroke={C.border} strokeWidth="1.5" />
        <text x="60" y="213" fill={C.muted} opacity="0.5" fontSize="11" fontFamily="sans-serif">e.g. Year 3 class teacher with a mixed-ability cohort…</text>

        {/* Tip box */}
        <rect x="44" y="238" width="552" height="36" rx="8"
          fill="none" stroke={C.accent} strokeWidth="1" opacity="0.4"
          style={{ fill: "color-mix(in srgb, #b5c8e8 8%, transparent)" }} />
        <text x="60" y="256" fill={C.muted} fontSize="10" fontFamily="sans-serif">💡</text>
        <text x="80" y="256" fill={C.muted} fontSize="10" fontFamily="sans-serif" fontWeight="700">Be specific.</text>
        <text x="137" y="256" fill={C.muted} fontSize="10" fontFamily="sans-serif"> Try "Year 3 teacher with mixed-ability class of 28" instead of just "Teacher".</text>
        <text x="80" y="268" fill={C.muted} fontSize="10" fontFamily="sans-serif"> The more specific the role, the more useful the story.</text>

        {/* Next button */}
        <rect x="504" y="284" width="90" height="30" rx="8" fill={C.accent} />
        <text x="549" y="304" fill={C.accentDark} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Next →</text>
      </svg>
      <figcaption style={{ fontSize: "0.75rem", color: "#7a90ab", textAlign: "center", marginTop: "0.5rem" }}>
        Step 1 — Choose or describe the user role. The SENCO chip is selected here.
      </figcaption>
    </figure>
  );
}
