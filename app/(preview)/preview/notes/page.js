"use client";

/*
 * Fixed viewport: 1440 × 900
 * Nav: 64px  |  Sidebar: 62px
 * Left notes panel: 280px  |  Right editor: remaining width
 *
 * Cursor animation:
 *   - Starts in notes list, hovers over active note
 *   - Moves to the editor textarea and types a few chars
 *   - Returns to list
 */

const NOTES = [
  { id: "1", title: "Year 4 Fractions lesson ideas", preview: "Think about using fraction walls and bar models...", time: "Today", pinned: true },
  { id: "2", title: "Parent evening notes - Autumn", preview: "Key points to follow up: Maya's reading...", time: "Yesterday" },
  { id: "3", title: "SEND support strategies", preview: "Breaking tasks into smaller chunks, visual timers...", time: "Mon" },
  { id: "4", title: "Trip to museum - planning", preview: "Permission slips out by 14th. Check lunch...", time: "Last week" },
  { id: "5", title: "Staff meeting - curriculum review", preview: "Science scheme update, new progression doc...", time: "Last week" },
];

const TYPED_TEXT = "Add bar model activity for equivalent fractions — ";

const ANIM_DUR = "16s";

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
    active: false,
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
    active: true,
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

export default function NotesPreview() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: 1440, height: 900,
      overflow: "hidden", background: "var(--bg)", color: "var(--text)",
      fontFamily: "inherit", position: "relative",
    }}>

      {/* ── Keyframe animations ──────────────────────────────────────── */}
      <style>{`
        /* Cursor: start at note list item 1, move to editor textarea, type, return */
        @keyframes ntCursor {
          0%          { opacity: 0;  transform: translate(130px, 200px); }
          5%          { opacity: 1;  transform: translate(160px, 230px); }   /* hover note 1 */
          12%         { opacity: 1;  transform: translate(158px, 232px); }   /* click */
          18%         { opacity: 1;  transform: translate(158px, 232px); }
          28%         { opacity: 1;  transform: translate(820px, 490px); }   /* move to textarea */
          33%         { opacity: 1;  transform: translate(818px, 492px); }   /* click into field */
          70%         { opacity: 1;  transform: translate(818px, 492px); }   /* stay while typing */
          78%         { opacity: 1;  transform: translate(160px, 270px); }   /* return to list */
          85%         { opacity: 0;  transform: translate(160px, 270px); }
          100%        { opacity: 0;  transform: translate(130px, 200px); }
        }

        /* Typing cursor blink in textarea */
        @keyframes ntTypeCursor {
          0%, 27%     { opacity: 0; }
          32%         { opacity: 1; }
          68%         { opacity: 1; }
          73%         { opacity: 0; }
          100%        { opacity: 0; }
        }

        /* Typed text reveals character by character */
        @keyframes ntTypedText {
          0%, 32%     { width: 0; }
          66%         { width: 340px; }
          72%         { width: 340px; }
          80%         { width: 0; }
          100%        { width: 0; }
        }

        /* Active note highlight pulses subtly */
        @keyframes ntActiveNote {
          0%, 10%     { background: rgb(var(--accent-rgb) / 0.07); }
          14%         { background: rgb(var(--accent-rgb) / 0.16); }
          30%         { background: rgb(var(--accent-rgb) / 0.12); }
          100%        { background: rgb(var(--accent-rgb) / 0.12); }
        }

        /* Pin icon gentle bob */
        @keyframes ntPinBob {
          0%, 40%     { transform: translateY(0); }
          50%         { transform: translateY(-2px); }
          60%         { transform: translateY(0); }
          100%        { transform: translateY(0); }
        }

        /* Right panel fades in when note is selected */
        @keyframes ntEditorIn {
          0%, 8%      { opacity: 0.4; }
          18%         { opacity: 1; }
          100%        { opacity: 1; }
        }
      `}</style>

      {/* ── Simulated cursor ─────────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: "absolute", zIndex: 999, pointerEvents: "none",
        width: 18, height: 22, top: 0, left: 0,
        animation: `ntCursor ${ANIM_DUR} ease-in-out infinite`,
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

        {/* ── Left notes panel ─────────────────────────────────────── */}
        <div style={{
          width: 280, minWidth: 280, background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Panel header */}
          <div style={{
            padding: "0.85rem 1rem 0.7rem",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: "0.65rem",
            }}>
              <span style={{ fontWeight: 800, fontSize: "0.92rem" }}>Notes</span>
              <button style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: 8, padding: "0.32rem 0.65rem",
                fontSize: "0.72rem", fontWeight: 700, fontFamily: "inherit",
                cursor: "default",
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New note
              </button>
            </div>

            {/* Search bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "0.38rem 0.65rem",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Search notes…</span>
            </div>
          </div>

          {/* Notes list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.5rem" }}>
            {NOTES.map((note, index) => (
              <div key={note.id} style={{
                padding: "0.7rem 0.75rem",
                borderRadius: 10,
                marginBottom: "0.2rem",
                cursor: "default",
                animation: index === 0 ? `ntActiveNote ${ANIM_DUR} ease-in-out infinite` : "none",
                background: index === 0 ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
                border: index === 0 ? "1px solid rgb(var(--accent-rgb) / 0.22)" : "1px solid transparent",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.25rem" }}>
                  <div style={{
                    fontSize: "0.8rem", fontWeight: 700,
                    lineHeight: 1.35,
                    color: index === 0 ? "var(--text)" : "var(--text)",
                    flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {note.title}
                  </div>
                  {note.pinned && (
                    <div style={{
                      flexShrink: 0,
                      animation: `ntPinBob ${ANIM_DUR} ease-in-out infinite`,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
                        <path d="M12 2l2.4 6.4H21l-5.5 4 2.1 6.5L12 15l-5.6 3.9 2.1-6.5L3 8.4h6.6z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginBottom: "0.25rem",
                }}>
                  {note.preview}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", opacity: 0.7 }}>
                  {note.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right editor panel ───────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
          background: "#fefde8",
          animation: `ntEditorIn ${ANIM_DUR} ease-in-out infinite`,
        }}>

          {/* Editor toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.65rem 1.2rem",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(254,253,232,0.95)",
          }}>
            {[
              {
                label: "Pin", icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2l2.4 6.4H21l-5.5 4 2.1 6.5L12 15l-5.6 3.9 2.1-6.5L3 8.4h6.6z"/>
                  </svg>
                ), color: "var(--accent)",
              },
              {
                label: "Saved", icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ), color: "#6aab85",
              },
              {
                label: "Preview", icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                ), color: "rgba(0,0,0,0.45)",
              },
              {
                label: "Delete", icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                ), color: "#c0392b",
              },
            ].map(({ label, icon, color }) => (
              <button key={label} style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 7, padding: "0.3rem 0.65rem",
                fontSize: "0.72rem", fontWeight: 600, color,
                fontFamily: "inherit", cursor: "default",
              }}>
                {icon}
                {label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "0.68rem", color: "rgba(0,0,0,0.35)" }}>
              Saved just now
            </span>
          </div>

          {/* Editor content area */}
          <div style={{ flex: 1, overflow: "hidden", padding: "1.6rem 2.2rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>

            {/* Title */}
            <div style={{
              fontSize: "1.55rem", fontWeight: 800,
              letterSpacing: "-0.025em", lineHeight: 1.2,
              color: "rgba(0,0,0,0.82)",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              paddingBottom: "0.7rem",
            }}>
              Year 4 Fractions lesson ideas
            </div>

            {/* Note body content */}
            <div style={{
              flex: 1, fontSize: "0.88rem", lineHeight: 1.78,
              color: "rgba(0,0,0,0.75)", overflow: "hidden",
            }}>
              <p style={{ margin: "0 0 0.9rem" }}>
                Think about using <strong>fraction walls</strong> and bar models as the main concrete resources. Children need to see equivalent fractions visually before moving to abstract notation.
              </p>
              <p style={{ margin: "0 0 0.9rem" }}>
                Opening activity: match fraction cards to shaded diagrams. Use ½, ¼, ¾, ⅓, ⅔. Pair higher-attaining pupils with mid to explain reasoning — good for oracy targets too.
              </p>
              <p style={{ margin: "0 0 0.9rem" }}>
                Main task (expected): order fractions on a number line. Give different denominators and ask: "Which is larger — ⅗ or ⅔?" Encourage drawing to support thinking.
              </p>

              {/* Animated typed line */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  animation: `ntTypedText ${ANIM_DUR} steps(${TYPED_TEXT.length}, end) infinite`,
                  color: "rgba(0,0,0,0.75)",
                  fontSize: "0.88rem",
                }}>
                  {TYPED_TEXT}
                </div>
                {/* Blinking text cursor */}
                <div style={{
                  width: 2, height: "1.1em",
                  background: "rgba(0,0,0,0.6)",
                  animation: `ntTypeCursor ${ANIM_DUR} ease-in-out infinite`,
                  flexShrink: 0,
                }} />
              </div>
            </div>

            {/* Attachments section */}
            <div style={{
              borderTop: "1px solid rgba(0,0,0,0.08)",
              paddingTop: "0.85rem",
            }}>
              <div style={{
                fontSize: "0.7rem", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(0,0,0,0.4)", marginBottom: "0.55rem",
              }}>
                Attachments
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  { name: "Year 4 Maths – Fractions.pack", icon: "📦" },
                  { name: "fraction-wall-diagram.png", icon: "🖼️" },
                ].map(({ name, icon }) => (
                  <div key={name} style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 8, padding: "0.3rem 0.65rem",
                    fontSize: "0.72rem", color: "rgba(0,0,0,0.6)",
                  }}>
                    <span>{icon}</span>
                    {name}
                  </div>
                ))}
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.3rem",
                  background: "transparent", border: "1px dashed rgba(0,0,0,0.2)",
                  borderRadius: 8, padding: "0.3rem 0.65rem",
                  fontSize: "0.72rem", color: "rgba(0,0,0,0.4)",
                  cursor: "default",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add attachment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
