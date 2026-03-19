"use client";

/*
 * Fixed viewport: 1440 × 900
 * Nav: 64px  |  Sidebar: 62px
 * Two-column layout: left form (~520px) | right result panel (remaining)
 *
 * Animation sequence (18s loop):
 *   0–15%   cursor moves through form fields, types topic
 *   16–28%  generate button pulses
 *   28–40%  right panel shows loading skeleton
 *   40–85%  right panel reveals generated content
 *   85–100% fade and reset
 */

const ANIM_DUR = "18s";

function NavLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" shapeRendering="geometricPrecision">
      <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15,0.7,-0.15,1,0 L21.5,7.5" stroke="var(--orange)" strokeWidth="1.7"/>
      <path d="M19.5,12 v6.5 c0,1.1,-0.9,2,-2,2 h-11 c-1.1,0,-2,-0.9,-2,-2 V12" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M19.5,12 C17.5,10.2,14.5,10.2,12,12" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M12,12.2 v8.1" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M12,12 C9.5,10.2,6.5,10.2,4.5,12" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

const SIDEBAR_ICONS = [
  {
    label: "Dashboard",
    active: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    label: "Lesson Generator",
    active: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    label: "Library",
    active: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    label: "Notes",
    active: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    active: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
      </svg>
    ),
  },
];

const TYPED_TOPIC = "Equivalent Fractions";

export default function LessonGeneratorPreview() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: 1440, height: 900,
      overflow: "hidden", background: "var(--bg)", color: "var(--text)",
      fontFamily: "inherit", position: "relative",
    }}>

      {/* ── Keyframe animations ──────────────────────────────────────── */}
      <style>{`
        /* Cursor moves through form fields then to generate button */
        @keyframes lgCursor {
          0%          { opacity: 0;  transform: translate(160px, 200px); }
          4%          { opacity: 1;  transform: translate(260px, 260px); }   /* hover year group */
          8%          { opacity: 1;  transform: translate(258px, 262px); }   /* click */
          13%         { opacity: 1;  transform: translate(260px, 340px); }   /* move to subject */
          17%         { opacity: 1;  transform: translate(258px, 342px); }   /* click */
          22%         { opacity: 1;  transform: translate(260px, 420px); }   /* move to topic */
          26%         { opacity: 1;  transform: translate(258px, 422px); }   /* click / type */
          44%         { opacity: 1;  transform: translate(258px, 422px); }   /* stay at topic while typing */
          50%         { opacity: 1;  transform: translate(260px, 640px); }   /* move to generate button */
          54%         { opacity: 1;  transform: translate(258px, 642px); }   /* click */
          60%         { opacity: 0;  transform: translate(258px, 642px); }
          100%        { opacity: 0;  transform: translate(160px, 200px); }
        }

        /* Topic text types in */
        @keyframes lgTopicText {
          0%, 25%     { width: 0; }
          43%         { width: ${TYPED_TOPIC.length * 9}px; }
          90%         { width: ${TYPED_TOPIC.length * 9}px; }
          96%         { width: 0; }
          100%        { width: 0; }
        }

        /* Typing cursor blink */
        @keyframes lgTypeCursor {
          0%, 24%     { opacity: 0; }
          28%         { opacity: 1; }
          44%         { opacity: 1; }
          49%         { opacity: 0; }
          100%        { opacity: 0; }
        }

        /* Generate button pulse on click */
        @keyframes lgGenBtn {
          0%, 48%     { transform: scale(1);   box-shadow: 0 2px 12px rgb(var(--accent-rgb) / 0.25); }
          52%         { transform: scale(0.97); box-shadow: 0 1px 6px rgb(var(--accent-rgb) / 0.2); }
          56%         { transform: scale(1.01); box-shadow: 0 4px 22px rgb(var(--accent-rgb) / 0.45); }
          62%         { transform: scale(1);   box-shadow: 0 2px 12px rgb(var(--accent-rgb) / 0.25); }
          100%        { transform: scale(1);   box-shadow: 0 2px 12px rgb(var(--accent-rgb) / 0.25); }
        }

        /* Loading skeleton shimmer */
        @keyframes lgShimmer {
          0%          { background-position: -600px 0; }
          100%        { background-position: 600px 0; }
        }

        /* Result panel: loading → content */
        @keyframes lgResultLoading {
          0%, 55%     { opacity: 1; }
          62%         { opacity: 0; }
          100%        { opacity: 0; }
        }
        @keyframes lgResultContent {
          0%, 58%     { opacity: 0; transform: translateY(6px); }
          65%         { opacity: 1; transform: translateY(0); }
          92%         { opacity: 1; transform: translateY(0); }
          100%        { opacity: 0; transform: translateY(0); }
        }

        /* Year group selector highlight */
        @keyframes lgYearFocus {
          0%, 6%      { border-color: var(--border); background: var(--field-bg); }
          8%, 12%     { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.06); }
          16%         { border-color: var(--border); background: var(--field-bg); }
          100%        { border-color: var(--border); background: var(--field-bg); }
        }

        /* Subject selector highlight */
        @keyframes lgSubjectFocus {
          0%, 14%     { border-color: var(--border); background: var(--field-bg); }
          16%, 20%    { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.06); }
          24%         { border-color: var(--border); background: var(--field-bg); }
          100%        { border-color: var(--border); background: var(--field-bg); }
        }

        /* Topic input highlight */
        @keyframes lgTopicFocus {
          0%, 23%     { border-color: var(--border); }
          26%, 46%    { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.1); }
          50%         { border-color: var(--border); box-shadow: none; }
          100%        { border-color: var(--border); box-shadow: none; }
        }

        /* Skeleton bar pulse */
        @keyframes lgSkelPulse {
          0%, 100%    { opacity: 0.5; }
          50%         { opacity: 1; }
        }
      `}</style>

      {/* ── Simulated cursor ─────────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: "absolute", zIndex: 999, pointerEvents: "none",
        width: 18, height: 22, top: 0, left: 0,
        animation: `lgCursor ${ANIM_DUR} ease-in-out infinite`,
      }}>
        <svg viewBox="0 0 18 22" width="18" height="22" fill="none">
          <path d="M2 2 L2 17 L6 12.5 L10 20 L12.5 18.8 L8.5 11.5 L15 11.5 Z"
            fill="white" stroke="#1a1a2e" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav style={{
        height: 64, minHeight: 64, display: "flex", alignItems: "center",
        padding: "0 1.5rem", gap: "0.75rem", background: "var(--nav-bg)",
        borderBottom: "1px solid var(--border)", zIndex: 10,
      }}>
        <NavLogo />
        <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
          Pr<span style={{ color: "var(--orange)" }}>i</span>m
          <span style={{ color: "var(--orange)" }}>a</span>ry
          <span style={{ color: "var(--orange)" }}>A</span>
          <span style={{ color: "var(--orange)" }}>I</span>
        </span>
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "0.38rem 0.85rem",
          fontSize: "0.8rem", color: "var(--muted)",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Search…
          <kbd style={{
            background: "var(--border)", borderRadius: 4, padding: "0.1rem 0.35rem",
            fontSize: "0.68rem", color: "var(--muted)", fontFamily: "inherit",
          }}>⌘K</kbd>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "rgb(var(--accent-rgb) / 0.15)", color: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.82rem",
        }}>SJ</div>
      </nav>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside style={{
          width: 62, minWidth: 62, background: "var(--surface)",
          borderRight: "1px solid var(--border)", display: "flex",
          flexDirection: "column", alignItems: "center",
          padding: "0.6rem 0", gap: "0.2rem",
        }}>
          {SIDEBAR_ICONS.map(({ label, active, icon }) => (
            <div key={label} title={label} style={{
              width: 44, height: 44, borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: active ? "var(--accent)" : "var(--muted)",
              background: active ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
            }}>{icon}</div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ width: 32, height: 1, background: "var(--border)", margin: "0.4rem 0" }} />
          <div style={{
            width: 44, height: 44, borderRadius: 11, display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--muted)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
        </aside>

        {/* ── Main two-column content ───────────────────────────────── */}
        <div style={{
          flex: 1, overflow: "hidden",
          display: "grid", gridTemplateColumns: "480px 1fr",
          gap: 0,
        }}>

          {/* ── LEFT: Form panel ─────────────────────────────────── */}
          <div style={{
            borderRight: "1px solid var(--border)",
            overflow: "hidden", display: "flex", flexDirection: "column",
          }}>
            {/* Form header */}
            <div style={{
              padding: "1.2rem 1.5rem 0.9rem",
              borderBottom: "1px solid var(--border)",
            }}>
              <p style={{
                margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)",
              }}>
                Lesson Pack Generator
              </p>
              <h1 style={{
                margin: 0, fontSize: "1.35rem", fontWeight: 800,
                letterSpacing: "-0.025em", lineHeight: 1.2,
              }}>
                Generate a lesson pack
              </h1>
            </div>

            {/* Form body */}
            <div style={{
              flex: 1, overflow: "hidden",
              padding: "1.2rem 1.5rem",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}>

              {/* Year Group */}
              <div>
                <label style={{
                  display: "block", fontSize: "0.78rem", fontWeight: 700,
                  marginBottom: "0.4rem", color: "var(--text)",
                }}>
                  Year Group
                </label>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: "0.85rem", color: "var(--text)",
                  background: "var(--field-bg)",
                  animation: `lgYearFocus ${ANIM_DUR} ease-in-out infinite`,
                }}>
                  <span>Year 4</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{
                  display: "block", fontSize: "0.78rem", fontWeight: 700,
                  marginBottom: "0.4rem", color: "var(--text)",
                }}>
                  Subject
                </label>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: "0.85rem", color: "var(--text)",
                  background: "var(--field-bg)",
                  animation: `lgSubjectFocus ${ANIM_DUR} ease-in-out infinite`,
                }}>
                  <span>Maths</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {/* Topic */}
              <div>
                <label style={{
                  display: "block", fontSize: "0.78rem", fontWeight: 700,
                  marginBottom: "0.4rem", color: "var(--text)",
                }}>
                  Topic
                </label>
                <div style={{
                  padding: "0.6rem 0.85rem",
                  border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: "0.85rem", background: "var(--field-bg)",
                  display: "flex", alignItems: "center",
                  animation: `lgTopicFocus ${ANIM_DUR} ease-in-out infinite`,
                  minHeight: 42,
                }}>
                  {/* Typed text */}
                  <div style={{
                    overflow: "hidden", whiteSpace: "nowrap",
                    animation: `lgTopicText ${ANIM_DUR} steps(${TYPED_TOPIC.length}, end) infinite`,
                    color: "var(--text)",
                  }}>
                    {TYPED_TOPIC}
                  </div>
                  {/* Blinking cursor */}
                  <div style={{
                    width: 2, height: "1em",
                    background: "var(--accent)",
                    animation: `lgTypeCursor ${ANIM_DUR} ease-in-out infinite`,
                    flexShrink: 0, marginLeft: 1,
                  }} />
                </div>
              </div>

              {/* Class Context */}
              <div>
                <label style={{
                  display: "block", fontSize: "0.78rem", fontWeight: 700,
                  marginBottom: "0.4rem", color: "var(--text)",
                }}>
                  Class Context <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
                </label>
                <div style={{
                  padding: "0.65rem 0.85rem",
                  border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: "0.8rem", color: "var(--muted)",
                  background: "var(--field-bg)",
                  lineHeight: 1.6, minHeight: 88,
                }}>
                  Year 4 mixed attainment class: 38% greater depth, 45% expected, 17% support. 3 pupils with reading difficulties — prefer visual scaffolds. Strong at mental maths, weaker on written reasoning.
                </div>
              </div>

              {/* Upload area */}
              <div style={{
                border: "1px dashed var(--border)", borderRadius: 10,
                padding: "0.9rem", textAlign: "center",
                background: "var(--field-bg)",
              }}>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  <span style={{ fontSize: "1.1rem", display: "block", marginBottom: "0.25rem" }}>📎</span>
                  Upload a planning document or curriculum overview
                  <div style={{ fontSize: "0.68rem", marginTop: "0.2rem", opacity: 0.7 }}>
                    PDF, Word, or text — optional
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <button style={{
                width: "100%", padding: "0.85rem",
                background: "var(--accent)", color: "#fff",
                border: "none", borderRadius: 12,
                fontSize: "0.95rem", fontWeight: 800,
                fontFamily: "inherit", cursor: "default",
                letterSpacing: "-0.01em",
                animation: `lgGenBtn ${ANIM_DUR} ease-in-out infinite`,
              }}>
                Generate Lesson Pack
              </button>
            </div>
          </div>

          {/* ── RIGHT: Result panel ───────────────────────────────── */}
          <div style={{
            overflow: "hidden", display: "flex", flexDirection: "column",
            background: "var(--surface)", position: "relative",
          }}>

            {/* Panel header */}
            <div style={{
              padding: "1.2rem 1.5rem 0.9rem",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{
                  margin: "0 0 0.25rem", fontSize: "0.72rem", fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)",
                }}>
                  Preview
                </p>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  Generated lesson pack
                </h2>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["Save to Library", "Export"].map((label) => (
                  <button key={label} style={{
                    background: label === "Export" ? "var(--accent)" : "var(--bg)",
                    color: label === "Export" ? "#fff" : "var(--text)",
                    border: "1px solid var(--border)", borderRadius: 9,
                    padding: "0.4rem 0.85rem", fontSize: "0.75rem",
                    fontWeight: 700, fontFamily: "inherit", cursor: "default",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Loading skeleton — visible before content */}
            <div style={{
              position: "absolute", inset: "72px 0 0 0",
              padding: "1.4rem 1.5rem",
              display: "flex", flexDirection: "column", gap: "1rem",
              animation: `lgResultLoading ${ANIM_DUR} ease-in-out infinite`,
              pointerEvents: "none",
            }}>
              {/* Pack badge skeleton */}
              <div style={{
                height: 80, borderRadius: 14,
                background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
                backgroundSize: "600px 100%",
                animation: `lgShimmer 1.4s linear infinite, lgSkelPulse ${ANIM_DUR} ease-in-out infinite`,
              }}/>
              {[140, 100, 120, 90].map((h, i) => (
                <div key={i} style={{
                  height: h, borderRadius: 12,
                  background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
                  backgroundSize: "600px 100%",
                  animation: `lgShimmer 1.4s ${i * 0.15}s linear infinite, lgSkelPulse ${ANIM_DUR} ease-in-out infinite`,
                }}/>
              ))}
            </div>

            {/* Generated content — fades in after loading */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: "1.2rem 1.5rem",
              display: "flex", flexDirection: "column", gap: "0.85rem",
              animation: `lgResultContent ${ANIM_DUR} ease-in-out infinite`,
            }}>

              {/* Pack header badge */}
              <div style={{
                background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.18), rgb(var(--accent-rgb) / 0.06))",
                border: "1px solid rgb(var(--accent-rgb) / 0.25)",
                borderRadius: 14, padding: "0.95rem 1.1rem",
              }}>
                <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.5rem" }}>
                  {["Year 4", "Maths"].map((tag) => (
                    <span key={tag} style={{
                      fontSize: "0.65rem", fontWeight: 700,
                      background: "rgb(var(--accent-rgb) / 0.18)", color: "var(--accent)",
                      borderRadius: 6, padding: "0.15rem 0.5rem",
                    }}>{tag}</span>
                  ))}
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Equivalent Fractions
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                  Generated lesson pack
                </div>
              </div>

              {/* Learning objectives */}
              <div style={{
                background: "var(--bg)", border: "1px solid var(--border-card)",
                borderRadius: 13, padding: "0.85rem 1rem",
              }}>
                <div style={{
                  fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.55rem",
                }}>
                  Learning Objectives
                </div>
                {[
                  "Recognise and explain equivalent fractions using diagrams and number lines",
                  "Use multiplication and division to find equivalent fractions",
                  "Apply knowledge to compare and order fractions with different denominators",
                ].map((obj, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "0.55rem",
                    marginBottom: i < 2 ? "0.45rem" : 0,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "rgb(var(--accent-rgb) / 0.14)", color: "var(--accent)",
                      fontSize: "0.6rem", fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 2,
                    }}>{i + 1}</div>
                    <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.55 }}>{obj}</p>
                  </div>
                ))}
              </div>

              {/* Differentiated activities */}
              <div style={{
                background: "var(--bg)", border: "1px solid var(--border-card)",
                borderRadius: 13, padding: "0.85rem 1rem",
              }}>
                <div style={{
                  fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.65rem",
                }}>
                  Differentiated Activities
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {[
                    { tier: "Support", content: "Match fraction cards to shaded diagrams. Use fraction walls to compare ¼, ½, and ¾. Sentence frames provided.", color: "#7ba7c9" },
                    { tier: "Expected", content: "Order fractions on a number line. Use multiplication to find equivalent fractions for ½, ⅓, and ¼. Show working.", color: "var(--accent)" },
                    { tier: "Greater Depth", content: "Investigate: how many fractions are equivalent to ½ between 0 and 1? Explain using two different representations.", color: "#8878b8" },
                  ].map(({ tier, content, color }) => (
                    <div key={tier} style={{
                      background: `${color}15`, border: `1px solid ${color}30`,
                      borderRadius: 10, padding: "0.6rem 0.75rem",
                    }}>
                      <div style={{
                        fontSize: "0.62rem", fontWeight: 800, color,
                        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem",
                      }}>{tier}</div>
                      <p style={{ margin: 0, fontSize: "0.75rem", lineHeight: 1.55 }}>{content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment */}
              <div style={{
                background: "var(--bg)", border: "1px solid var(--border-card)",
                borderRadius: 13, padding: "0.85rem 1rem",
              }}>
                <div style={{
                  fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.55rem",
                }}>
                  Mini Assessment
                </div>
                {[
                  "Write two fractions equivalent to ¾.",
                  "Are ⅖ and 4/10 equivalent? Explain how you know.",
                  "Order these fractions from smallest to largest: ½, ⅓, ¾, ¼",
                ].map((q, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "0.55rem",
                    marginBottom: i < 2 ? "0.5rem" : 0,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: "rgb(var(--accent-rgb) / 0.14)", color: "var(--accent)",
                      fontSize: "0.58rem", fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 2,
                    }}>Q{i + 1}</div>
                    <p style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.55 }}>{q}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
