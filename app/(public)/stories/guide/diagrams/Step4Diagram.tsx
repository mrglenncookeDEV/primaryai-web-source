const C = {
  bg: "#07101c", surface: "#0d1a2e", border: "#1a3050",
  accent: "#b5c8e8", accentDark: "#071428", text: "#f0f4fb",
  muted: "#7a90ab", field: "#050e18", btn: "#1a3050",
  chrome: "#0a1628", green: "#4ade80",
};

const STEP_XS = [64, 176, 288, 400, 512];
const LABELS = ["Who", "What", "Why", "Criteria", "Review"];

export default function Step4Diagram() {
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
        viewBox="0 0 640 340"
        width="100%"
        role="img"
        aria-labelledby="diag-step4-title"
        style={{ display: "block", background: C.bg, borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none" }}
      >
        <title id="diag-step4-title">Step 4: adding acceptance criteria — testable conditions that define when the story is done</title>

        {/* Step tracker */}
        <rect x="20" y="14" width="600" height="60" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
        {STEP_XS.map((x, i) => {
          const done = i < 3;
          const active = i === 3;
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
        <rect x="20" y="88" width="600" height="232" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />

        <text x="44" y="112" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">ACCEPTANCE CRITERIA</text>
        <text x="44" y="128" fill={C.muted} fontSize="10" fontFamily="sans-serif">List the testable conditions that must be true for this story to be done.</text>

        {/* Criterion rows */}
        {[
          { num: "1.", text: "The user can export the plan as a PDF in one click", filled: true },
          { num: "2.", text: "The generated plan covers all five learning objectives", filled: true },
          { num: "3.", text: "Criterion 3…", filled: false, focused: true },
        ].map(({ num, text, filled, focused }, i) => (
          <g key={i}>
            <text x="44" y={154 + i * 36} fill={C.muted} fontSize="10" fontFamily="monospace">{num}</text>
            <rect x="60" y={140 + i * 36} width="536" height="28" rx="7"
              fill={C.field}
              stroke={focused ? C.accent : C.border}
              strokeWidth={focused ? 2 : 1.5} />
            {focused && <rect x="60" y={140 + i * 36} width="536" height="28" rx="7" fill="none" stroke={C.accent} strokeWidth="1.5" opacity="0.4" />}
            <text x="76" y={158 + i * 36} fill={filled ? C.text : C.muted} opacity={filled ? 1 : 0.4} fontSize="11" fontFamily="sans-serif">{text}</text>
            {focused && <text x="590" y={158 + i * 36} fill={C.accent} fontSize="12" fontFamily="monospace">|</text>}
          </g>
        ))}

        {/* Add criterion button */}
        <rect x="60" y="252" width="536" height="26" rx="7" fill="transparent" stroke={C.border} strokeWidth="1.5" strokeDasharray="5 3" />
        <text x="328" y="269" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">+ Add criterion</text>

        {/* Divider + notes */}
        <line x1="44" y1="288" x2="596" y2="288" stroke={C.border} strokeWidth="1" />
        <text x="44" y="304" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">NOTES (OPTIONAL)</text>

        {/* Buttons */}
        <rect x="44" y="308" width="90" height="24" rx="7" fill="transparent" stroke={C.border} strokeWidth="1.5" />
        <text x="89" y="324" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">← Back</text>
        <rect x="484" y="308" width="112" height="24" rx="7" fill={C.accent} />
        <text x="540" y="324" fill={C.accentDark} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Review →</text>
      </svg>
      <figcaption style={{ fontSize: "0.75rem", color: "#7a90ab", textAlign: "center", marginTop: "0.5rem" }}>
        Step 4 — Add 3–5 testable acceptance criteria. Row 3 is focused and ready to type.
      </figcaption>
    </figure>
  );
}
