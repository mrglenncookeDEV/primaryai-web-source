const C = {
  bg: "#07101c", surface: "#0d1a2e", border: "#1a3050",
  accent: "#b5c8e8", accentDark: "#071428", text: "#f0f4fb",
  muted: "#7a90ab", field: "#050e18", btn: "#1a3050",
  chrome: "#0a1628", green: "#4ade80", blue: "#3b82f6",
};

export default function HomepageDiagram() {
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
          fontSize: 11, color: C.muted, letterSpacing: "0.03em",
        }}>
          primaryai.org.uk
        </div>
      </div>
      <svg
        viewBox="0 0 640 300"
        width="100%"
        role="img"
        aria-labelledby="diag-home-title"
        style={{ display: "block", background: C.bg, borderRadius: "0 0 10px 10px", border: `1px solid ${C.border}`, borderTop: "none" }}
      >
        <title id="diag-home-title">PrimaryAI homepage showing the Story Builder entry point button</title>

        {/* Nav bar */}
        <rect x="0" y="0" width="640" height="44" fill={C.surface} />
        <rect x="0" y="44" width="640" height="1" fill={C.border} />
        <text x="20" y="26" fill={C.accent} fontSize="13" fontWeight="700" fontFamily="sans-serif">PrimaryAI</text>
        <rect x="528" y="10" width="92" height="24" rx="6" fill={C.btn} />
        <text x="574" y="26" fill={C.text} fontSize="11" textAnchor="middle" fontFamily="sans-serif">Sign in →</text>

        {/* Hero text */}
        <text x="60" y="96" fill={C.text} fontSize="20" fontWeight="700" fontFamily="sans-serif">AI lesson planning</text>
        <text x="60" y="118" fill={C.text} fontSize="20" fontWeight="700" fontFamily="sans-serif">for primary schools</text>
        <text x="60" y="143" fill={C.muted} fontSize="12" fontFamily="sans-serif">Built with teachers, for teachers.</text>

        {/* Primary CTA */}
        <rect x="60" y="160" width="148" height="34" rx="8" fill={C.accent} />
        <text x="134" y="182" fill={C.accentDark} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Get early access →</text>

        {/* Story builder CTA - highlighted */}
        <rect x="60" y="204" width="200" height="34" rx="8" fill={C.blue} opacity="0.25" stroke={C.blue} strokeWidth="2" />
        <text x="160" y="226" fill="#93c5fd" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">Contribute to development</text>

        {/* Annotation arrow */}
        <path d="M 272 218 Q 320 218 330 185" fill="none" stroke={C.green} strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#arrow-home)" />
        <defs>
          <marker id="arrow-home" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={C.green} />
          </marker>
        </defs>
        <rect x="332" y="160" width="200" height="52" rx="8" fill={C.surface} stroke={C.green} strokeWidth="1.5" />
        <text x="432" y="181" fill={C.green} fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">👆 Click here</text>
        <text x="432" y="197" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">Opens the Story Builder</text>
        <text x="432" y="210" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">— no sign-in needed</text>

        {/* Direct URL row */}
        <rect x="60" y="256" width="520" height="28" rx="6" fill={C.surface} stroke={C.border} strokeWidth="1" />
        <text x="80" y="274" fill={C.muted} fontSize="11" fontFamily="monospace">Or go direct:</text>
        <text x="178" y="274" fill={C.accent} fontSize="11" fontFamily="monospace">primaryai.org.uk/stories</text>
        <text x="478" y="274" fill={C.muted} fontSize="10" textAnchor="middle" fontFamily="sans-serif">↵ Enter</text>
      </svg>
      <figcaption style={{ fontSize: "0.75rem", color: "#7a90ab", textAlign: "center", marginTop: "0.5rem" }}>
        The Story Builder is accessible from the homepage — no account required.
      </figcaption>
    </figure>
  );
}
