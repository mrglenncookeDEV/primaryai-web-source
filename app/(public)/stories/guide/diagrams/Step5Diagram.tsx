const C = {
  bg: "#07101c", surface: "#0d1a2e", border: "#1a3050",
  accent: "#b5c8e8", accentDark: "#071428", text: "#f0f4fb",
  muted: "#7a90ab", field: "#050e18", btn: "#1a3050",
  chrome: "#0a1628", green: "#4ade80", blue: "#3b82f6",
};

const STEP_XS = [64, 176, 288, 400, 512];
const LABELS = ["Who", "What", "Why", "Criteria", "Review"];

export default function Step5Diagram() {
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
        aria-labelledby="diag-step5-title"
        style={{ display: "block", background: C.bg, borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none" }}
      >
        <title id="diag-step5-title">Step 5: preview of the completed story before saving — shows story sentence, badges, and acceptance criteria</title>

        {/* Step tracker — all done */}
        <rect x="20" y="14" width="600" height="60" rx="8" fill={C.surface} stroke={C.border} strokeWidth="1" />
        {STEP_XS.map((x, i) => {
          const active = i === 4;
          return (
            <g key={i}>
              <circle cx={x} cy={32} r={12}
                fill={active ? C.accent : C.green}
                stroke={active ? C.accent : C.green}
                strokeWidth="1.5" />
              {active ? (
                <text x={x} y={36} fill={C.accentDark} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">5</text>
              ) : (
                <path d={`M${x - 5},32 L${x - 1},36 L${x + 5},28`}
                  stroke={C.accentDark} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}
              <text x={x} y={58} fill={active ? C.accent : C.green} fontSize="9" textAnchor="middle" fontFamily="sans-serif">{LABELS[i]}</text>
              {i < 4 && <line x1={x + 13} y1={32} x2={STEP_XS[i + 1] - 13} y2={32} stroke={C.green} strokeWidth="1.5" />}
            </g>
          );
        })}

        {/* Card */}
        <rect x="20" y="88" width="600" height="272" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1" />

        <text x="44" y="112" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">REVIEW YOUR STORY</text>
        <text x="44" y="128" fill={C.muted} fontSize="10" fontFamily="sans-serif">Check everything looks right before saving to the backlog.</text>

        {/* Story preview card */}
        <rect x="44" y="136" width="552" height="86" rx="8" fill={C.field} stroke={C.border} strokeWidth="1.5" />
        <rect x="44" y="136" width="4" height="86" rx="2" fill={C.accent} />
        <text x="68" y="158" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1" fontFamily="sans-serif">DRAFT — NOT YET SAVED</text>
        <text x="68" y="176" fill={C.text} fontSize="11" fontStyle="italic" fontFamily="sans-serif">
          As a{" "}
        </text>
        <text x="101" y="176" fill={C.accent} fontSize="11" fontWeight="700" fontStyle="normal" fontFamily="sans-serif">SENCO</text>
        <text x="148" y="176" fill={C.text} fontSize="11" fontStyle="italic" fontFamily="sans-serif">, I want to</text>
        <text x="68" y="194" fill={C.text} fontSize="11" fontStyle="italic" fontFamily="sans-serif">track pupil progress</text>
        <text x="198" y="194" fill={C.text} fontSize="11" fontStyle="italic" fontFamily="sans-serif">, so that I can</text>
        <text x="68" y="210" fill={C.text} fontSize="11" fontStyle="italic" fontFamily="sans-serif">reduce weekly planning from 4 hours to under 1 hour.</text>

        {/* Badges */}
        <rect x="44" y="232" width="82" height="20" rx="10" fill={`${C.blue}22`} stroke={`${C.blue}55`} strokeWidth="1" />
        <circle cx="58" cy="242" r="4" fill={C.blue} />
        <text x="70" y="246" fill={C.blue} fontSize="9" fontWeight="700" fontFamily="monospace">Could have</text>

        <rect x="134" y="232" width="72" height="20" rx="10" fill={C.btn} stroke={C.border} strokeWidth="1" />
        <text x="170" y="246" fill={C.muted} fontSize="9" fontFamily="monospace" textAnchor="middle">Medium</text>

        {/* Acceptance criteria */}
        <text x="44" y="270" fill={C.muted} fontSize="9" fontWeight="700" letterSpacing="1" fontFamily="sans-serif">ACCEPTANCE CRITERIA</text>
        {[
          "The user can export the plan as a PDF in one click",
          "The generated plan covers all five learning objectives",
        ].map((text, i) => (
          <g key={i}>
            <text x="54" y={290 + i * 18} fill={C.green} fontSize="11" fontFamily="sans-serif">✓</text>
            <text x="70" y={290 + i * 18} fill={C.muted} fontSize="10" fontFamily="sans-serif">{text}</text>
          </g>
        ))}

        {/* Buttons */}
        <rect x="44" y="332" width="80" height="24" rx="7" fill="transparent" stroke={C.border} strokeWidth="1.5" />
        <text x="84" y="348" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">← Back</text>

        <rect x="136" y="332" width="86" height="24" rx="7" fill="transparent" stroke={C.border} strokeWidth="1.5" />
        <text x="179" y="348" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">Start over</text>

        {/* Save button — highlighted */}
        <rect x="454" y="328" width="132" height="32" rx="8" fill={C.accent} />
        <rect x="448" y="322" width="144" height="44" rx="10" fill="none" stroke={C.accent} strokeWidth="2" opacity="0.4" />
        <text x="520" y="349" fill={C.accentDark} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Save to backlog ✓</text>
      </svg>
      <figcaption style={{ fontSize: "0.75rem", color: "#7a90ab", textAlign: "center", marginTop: "0.5rem" }}>
        Step 5 — Preview the complete story. All steps are done. Click Save to backlog.
      </figcaption>
    </figure>
  );
}
