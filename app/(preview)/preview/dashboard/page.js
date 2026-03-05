"use client";

/*
 * Fixed viewport: 1440 × 900
 * Sidebar: 62px  |  content padding: 1.6rem (≈26px each side)
 * Two-col grid: left=1fr (~967px), right=340px, gap=20px
 * Calendar inner width ≈ 965px
 * Time col: 48px  →  day col width: (965-48)/5 ≈ 183px
 *
 * Mon 9:00 event centre (in page px):
 *   x = 62 + 26 + 48 + 183/2 ≈ 228
 *   y ≈ 64+22+70+16+80+20+44+38+54+25 = 433
 *
 * Fri 9:00 centre:
 *   x ≈ 228 + 4*183 = 228 + 732 = 960
 *   y ≈ 433
 *
 * Drag ghost translateX: 4 * 183 = 732
 */

const SUBJECTS = {
  Maths: "var(--accent)", English: "#7ba7c9", Science: "#6aab85",
  History: "#b8924a", Geography: "#5a9e85", Computing: "#8878b8",
  Music: "#b87898", Art: "#b8804a", PE: "#5a9eae",
};

const LIBRARY_ITEMS = [
  { id:"1", subject:"Maths",     yearGroup:"Year 4", title:"Year 4 Maths – Fractions" },
  { id:"2", subject:"English",   yearGroup:"Year 3", title:"Year 3 English – Persuasive Writing" },
  { id:"3", subject:"Science",   yearGroup:"Year 5", title:"Year 5 Science – Forces & Motion" },
  { id:"4", subject:"History",   yearGroup:"Year 2", title:"Year 2 History – Great Fire of London" },
  { id:"5", subject:"Computing", yearGroup:"Year 6", title:"Year 6 Computing – Algorithms" },
  { id:"6", subject:"Geography", yearGroup:"Year 4", title:"Year 4 Geography – Rivers & Erosion" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const START_HOUR = 8;
const END_HOUR = 16;
const PX_PER_HOUR = 54;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR;
const TIME_COL_W = 48;

// Mon 9:00 drag source geometry (relative to calendar grid container)
const DRAG_TOP  = (9 - START_HOUR) * PX_PER_HOUR + 1;   // 55
const DRAG_H    = PX_PER_HOUR - 3;                         // 51
const DAY_COL_W = 183;                                      // approximate 1fr

const EVENTS = [
  { day:0, start:9,  dur:1,    label:"Maths – Fractions",  subject:"Maths"     },
  { day:0, start:13, dur:1,    label:"English – Writing",   subject:"English"   },
  { day:1, start:9,  dur:1,    label:"Science – Forces",    subject:"Science"   },
  { day:1, start:11, dur:.75,  label:"History – Romans",    subject:"History"   },
  { day:2, start:10, dur:1,    label:"Computing – Scratch", subject:"Computing" },
  { day:2, start:13, dur:.75,  label:"Music – Rhythm",      subject:"Music"     },
  { day:3, start:9,  dur:1,    label:"Maths – Geometry",    subject:"Maths"     },
  { day:3, start:14, dur:1,    label:"Art – Printing",      subject:"Art"       },
  { day:4, start:9,  dur:.75,  label:"PE – Athletics",      subject:"PE"        },
  { day:4, start:13, dur:1,    label:"Geography – Rivers",  subject:"Geography" },
];

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
  { label:"Dashboard", active:true,  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { label:"New Lesson",active:false, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  { label:"Library",   active:false, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { label:"Settings",  active:false, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> },
];

const ANIM_DUR = "16s";

export default function DashboardPreview() {
  const todayIdx = new Date().getDay() - 1;

  return (
    <div style={{ display:"flex", flexDirection:"column", width:1440, height:900,
                  overflow:"hidden", background:"var(--bg)", color:"var(--text)",
                  fontFamily:"inherit", position:"relative" }}>

      {/* ── Keyframe animations ──────────────────────────────────────── */}
      <style>{`
        /* Cursor glides Mon→Fri then retreats */
        @keyframes dbCursor {
          0%          { opacity:0; transform:translate(192px, 400px); }
          6%          { opacity:1; transform:translate(228px, 433px); }   /* hover Mon Maths */
          12%         { opacity:1; transform:translate(222px, 429px); }   /* slight jiggle = click */
          14%         { opacity:1; transform:translate(222px, 429px); }
          55%         { opacity:1; transform:translate(960px, 433px); }   /* drag to Fri */
          62%         { opacity:1; transform:translate(958px, 435px); }   /* micro adjust = drop */
          70%         { opacity:0; transform:translate(958px, 435px); }
          100%        { opacity:0; transform:translate(192px, 400px); }
        }
        /* Ghost event travels Mon→Fri */
        @keyframes dbGhost {
          0%,11%      { opacity:0;   transform:translateX(0); }
          14%         { opacity:0.7; transform:translateX(0); }
          55%         { opacity:0.7; transform:translateX(732px); }
          62%         { opacity:0;   transform:translateX(732px); }
          100%        { opacity:0;   transform:translateX(732px); }
        }
        /* Source event fades while dragging */
        @keyframes dbSource {
          0%,11%      { opacity:1; }
          14%,60%     { opacity:0.25; }
          66%         { opacity:1; }
          100%        { opacity:1; }
        }
        /* Drop-zone target pulses in Fri col */
        @keyframes dbDropZone {
          0%,12%      { opacity:0; }
          16%,54%     { opacity:1; }
          62%         { opacity:0; }
          100%        { opacity:0; }
        }
        /* Dropped event materialises in Fri col */
        @keyframes dbDropped {
          0%,61%      { opacity:0; transform:scaleY(0.6); }
          68%,80%     { opacity:1; transform:scaleY(1); }
          88%         { opacity:0; }
          100%        { opacity:0; }
        }
        /* Library list gentle auto-scroll */
        @keyframes dbLibScroll {
          0%,20%      { transform:translateY(0); }
          55%,75%     { transform:translateY(-88px); }
          90%,100%    { transform:translateY(0); }
        }
      `}</style>

      {/* ── Simulated cursor ─────────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position:"absolute", zIndex:999, pointerEvents:"none",
        width:18, height:22, top:0, left:0,
        animation:`dbCursor ${ANIM_DUR} ease-in-out infinite`,
      }}>
        <svg viewBox="0 0 18 22" width="18" height="22" fill="none">
          <path d="M2 2 L2 17 L6 12.5 L10 20 L12.5 18.8 L8.5 11.5 L15 11.5 Z"
            fill="white" stroke="#1a1a2e" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav style={{ height:64, minHeight:64, display:"flex", alignItems:"center",
                    padding:"0 1.5rem", gap:"0.75rem", background:"var(--nav-bg)",
                    borderBottom:"1px solid var(--border)", zIndex:10 }}>
        <NavLogo />
        <span style={{ fontWeight:800, fontSize:"1.05rem", letterSpacing:"-0.01em" }}>
          Pr<span style={{ color:"var(--orange)" }}>i</span>m
          <span style={{ color:"var(--orange)" }}>a</span>ry
          <span style={{ color:"var(--orange)" }}>A</span>
          <span style={{ color:"var(--orange)" }}>I</span>
        </span>
        <div style={{ flex:1 }}/>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                      background:"var(--surface)", border:"1px solid var(--border)",
                      borderRadius:8, padding:"0.38rem 0.85rem",
                      fontSize:"0.8rem", color:"var(--muted)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Search…
          <kbd style={{ background:"var(--border)", borderRadius:4, padding:"0.1rem 0.35rem",
                        fontSize:"0.68rem", color:"var(--muted)", fontFamily:"inherit" }}>⌘K</kbd>
        </div>
        <div style={{ width:34, height:34, borderRadius:"50%",
                      background:"rgb(var(--accent-rgb) / 0.15)", color:"var(--accent)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontWeight:700, fontSize:"0.82rem" }}>SJ</div>
      </nav>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Sidebar */}
        <aside style={{ width:62, minWidth:62, background:"var(--surface)",
                        borderRight:"1px solid var(--border)", display:"flex",
                        flexDirection:"column", alignItems:"center",
                        padding:"0.6rem 0", gap:"0.2rem" }}>
          {SIDEBAR_ICONS.map(({ label, active, icon }) => (
            <div key={label} title={label} style={{
              width:44, height:44, borderRadius:11,
              display:"flex", alignItems:"center", justifyContent:"center",
              color: active ? "var(--accent)" : "var(--muted)",
              background: active ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
            }}>{icon}</div>
          ))}
          <div style={{ flex:1 }}/>
          <div style={{ width:32, height:1, background:"var(--border)", margin:"0.4rem 0" }}/>
          <div style={{ width:44, height:44, borderRadius:11, display:"flex",
                        alignItems:"center", justifyContent:"center", color:"var(--muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ flex:1, overflow:"hidden", padding:"1.4rem 1.6rem",
                      display:"flex", flexDirection:"column", gap:"1rem" }}>

          {/* Greeting */}
          <div style={{ display:"flex", alignItems:"center" }}>
            <div>
              <p style={{ margin:0, fontSize:"0.72rem", color:"var(--muted)",
                          fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>
                Good Morning
              </p>
              <h1 style={{ margin:0, fontSize:"1.45rem", fontWeight:800, letterSpacing:"-0.02em" }}>
                Sarah Johnson
              </h1>
            </div>
            <div style={{ flex:1 }}/>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                          background:"var(--surface)", border:"1px solid var(--border)",
                          borderRadius:20, padding:"0.45rem 1rem",
                          fontSize:"0.78rem", color:"var(--muted)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Search pages, lesson packs…
              <kbd style={{ background:"var(--border)", borderRadius:4, padding:"0.1rem 0.35rem",
                            fontSize:"0.65rem", fontFamily:"inherit" }}>⌘K</kbd>
            </div>
          </div>

          {/* Hero stats */}
          <div className="dashboard-hero">
            {[
              { value:"24", label:"Lesson Packs", sub:"saved in library" },
              { value:"8",  label:"Subjects",     sub:"covered this term" },
              { value:"31", label:"Scheduled",    sub:"lessons on calendar" },
              { value:"3",  label:"Today",        sub:"lessons remaining" },
            ].map(({ value, label, sub }) => (
              <div key={label} className="dashboard-hero-stat">
                <span className="dashboard-hero-value">{value}</span>
                <span className="dashboard-hero-label">{label}</span>
                <span className="dashboard-hero-sub">{sub}</span>
              </div>
            ))}
          </div>

          {/* Two-column grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:"1.25rem",
                        flex:1, minHeight:0 }}>

            {/* ── Week calendar ───────────────────────────────────── */}
            <div style={{ background:"var(--surface)", borderRadius:16,
                          border:"1px solid var(--border-card)",
                          overflow:"hidden", display:"flex", flexDirection:"column" }}>

              {/* Card header */}
              <div style={{ display:"flex", alignItems:"center",
                            justifyContent:"space-between",
                            padding:"0.8rem 1rem 0.6rem",
                            borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontWeight:700, fontSize:"0.9rem" }}>Week Schedule</span>
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  {["← Prev","Next →"].map(t => (
                    <button key={t} style={{ background:"var(--surface)",
                      border:"1px solid var(--border)", borderRadius:7,
                      padding:"0.25rem 0.7rem", fontSize:"0.75rem",
                      color:"var(--muted)", cursor:"default" }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Day header row */}
              <div style={{ display:"grid",
                            gridTemplateColumns:`${TIME_COL_W}px repeat(5,1fr)`,
                            borderBottom:"1px solid var(--border)" }}>
                <div/>
                {DAYS.map((d, i) => (
                  <div key={d} style={{
                    padding:"0.45rem 0.5rem", textAlign:"center",
                    fontSize:"0.72rem", fontWeight:700,
                    letterSpacing:"0.05em", textTransform:"uppercase",
                    color: i === todayIdx ? "var(--accent)" : "var(--muted)",
                    borderLeft:"1px solid var(--border)",
                  }}>
                    {d}
                    {i === todayIdx && (
                      <div style={{ margin:"2px auto 0", width:5, height:5,
                                    borderRadius:"50%", background:"var(--accent)" }}/>
                    )}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
                <div style={{ display:"grid",
                              gridTemplateColumns:`${TIME_COL_W}px repeat(5,1fr)`,
                              height:GRID_HEIGHT, position:"relative" }}>

                  {/* Time labels */}
                  <div style={{ position:"relative" }}>
                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                      <div key={i} style={{ position:"absolute",
                        top: i * PX_PER_HOUR - 7, left:0, right:0,
                        textAlign:"right", paddingRight:8,
                        fontSize:"0.62rem", color:"var(--muted)" }}>
                        {START_HOUR + i}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {DAYS.map((_, dayIdx) => (
                    <div key={dayIdx} style={{
                      position:"relative",
                      borderLeft:"1px solid var(--border)",
                      background: dayIdx === todayIdx
                        ? "rgb(var(--accent-rgb) / 0.025)"
                        : "transparent",
                    }}>
                      {/* Hour lines */}
                      {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                        <div key={i} style={{
                          position:"absolute", top: i * PX_PER_HOUR,
                          left:0, right:0, borderTop:"1px solid var(--border)", opacity:0.5,
                        }}/>
                      ))}

                      {/* Drop zone target (Fri col only) */}
                      {dayIdx === 4 && (
                        <div style={{
                          position:"absolute",
                          top: DRAG_TOP, left:3, right:3, height: DRAG_H,
                          borderRadius:7,
                          border:"2px dashed var(--accent)",
                          background:"rgb(var(--accent-rgb) / 0.08)",
                          animation:`dbDropZone ${ANIM_DUR} ease-in-out infinite`,
                          boxSizing:"border-box",
                        }}/>
                      )}

                      {/* Dropped event (Fri col) */}
                      {dayIdx === 4 && (
                        <div style={{
                          position:"absolute",
                          top: DRAG_TOP, left:3, right:3, height: DRAG_H,
                          borderRadius:7,
                          background:"rgb(var(--accent-rgb) / 0.22)",
                          border:"1px solid rgb(var(--accent-rgb) / 0.55)",
                          padding:"3px 6px", overflow:"hidden",
                          transformOrigin:"top center",
                          animation:`dbDropped ${ANIM_DUR} ease-in-out infinite`,
                        }}>
                          <div style={{ fontSize:"0.62rem", fontWeight:700,
                                        color:"var(--accent)", lineHeight:1.3 }}>
                            Maths – Fractions
                          </div>
                        </div>
                      )}

                      {/* Regular events */}
                      {EVENTS.filter(e => e.day === dayIdx).map((evt, ei) => {
                        const top    = (evt.start - START_HOUR) * PX_PER_HOUR + 1;
                        const height = evt.dur * PX_PER_HOUR - 3;
                        const color  = SUBJECTS[evt.subject] || "var(--muted)";
                        // Source event (Mon 9:00 Maths) fades during drag
                        const isDragSource = dayIdx === 0 && evt.start === 9 && evt.subject === "Maths";
                        return (
                          <div key={ei} style={{
                            position:"absolute", top, left:3, right:3, height,
                            borderRadius:7,
                            background:`${color}22`,
                            border:`1px solid ${color}55`,
                            padding:"3px 6px", overflow:"hidden",
                            ...(isDragSource
                              ? { animation:`dbSource ${ANIM_DUR} ease-in-out infinite` }
                              : {}),
                          }}>
                            <div style={{ fontSize:"0.62rem", fontWeight:700,
                                          color, lineHeight:1.3,
                                          overflow:"hidden", textOverflow:"ellipsis",
                                          whiteSpace:"nowrap" }}>
                              {evt.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* ── Drag ghost ─────────────────────────────────── */}
                  {/* Lives in the grid container, starts at Mon col position */}
                  <div style={{
                    position:"absolute",
                    top: DRAG_TOP,
                    left: TIME_COL_W + 3,        /* Mon col left edge + 3px inset */
                    width: DAY_COL_W - 6,
                    height: DRAG_H,
                    borderRadius:7,
                    background:"rgb(var(--accent-rgb) / 0.65)",
                    border:"1.5px solid var(--accent)",
                    padding:"3px 6px",
                    boxShadow:"0 8px 28px rgb(var(--accent-rgb) / 0.45)",
                    zIndex:50,
                    pointerEvents:"none",
                    animation:`dbGhost ${ANIM_DUR} ease-in-out infinite`,
                    overflow:"hidden",
                  }}>
                    <div style={{ fontSize:"0.62rem", fontWeight:700,
                                  color:"#fff", lineHeight:1.3 }}>
                      Maths – Fractions
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Right column ────────────────────────────────────── */}
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem", overflow:"hidden" }}>

              {/* Library with auto-scroll */}
              <div style={{ background:"var(--surface)", borderRadius:16,
                            border:"1px solid var(--border-card)",
                            padding:"0.9rem 1rem",
                            display:"flex", flexDirection:"column", gap:"0.6rem",
                            overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center",
                              justifyContent:"space-between", marginBottom:"0.25rem" }}>
                  <span style={{ fontWeight:700, fontSize:"0.88rem" }}>Recent Packs</span>
                  <span style={{ fontSize:"0.72rem", color:"var(--accent)", fontWeight:600 }}>
                    View all →
                  </span>
                </div>
                {/* Scrolling list */}
                <div style={{ overflow:"hidden", height:220 }}>
                  <div style={{ animation:`dbLibScroll ${ANIM_DUR} ease-in-out infinite` }}>
                    {LIBRARY_ITEMS.map(item => {
                      const color = SUBJECTS[item.subject] || "var(--muted)";
                      return (
                        <div key={item.id} style={{
                          display:"flex", alignItems:"center", gap:"0.65rem",
                          padding:"0.5rem 0.6rem", borderRadius:10,
                          background:"var(--bg)", border:"1px solid var(--border)",
                          marginBottom:"0.5rem",
                        }}>
                          <div style={{ width:8, height:8, borderRadius:"50%",
                                        background:color, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:"0.78rem", fontWeight:600,
                                          overflow:"hidden", textOverflow:"ellipsis",
                                          whiteSpace:"nowrap" }}>{item.title}</div>
                            <div style={{ fontSize:"0.68rem", color:"var(--muted)" }}>
                              {item.yearGroup}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Insight card */}
              <div className="insight-card">
                <div style={{ display:"flex", alignItems:"center",
                              gap:"0.6rem", marginBottom:"0.6rem" }}>
                  <span style={{ fontSize:"1.1rem" }}>💡</span>
                  <span style={{ fontWeight:700, fontSize:"0.88rem" }}>Curriculum Insight</span>
                </div>
                <p style={{ margin:"0 0 0.5rem", fontSize:"0.8rem",
                            lineHeight:1.55, color:"var(--text)" }}>
                  <strong>Maths</strong> is your most-used subject at <strong>38%</strong>.
                </p>
                <p style={{ margin:0, fontSize:"0.78rem", color:"var(--muted)", lineHeight:1.5 }}>
                  <span style={{ color:"var(--accent)", fontWeight:600 }}>PE</span> and{" "}
                  <span style={{ color:"var(--accent)", fontWeight:600 }}>PSHE</span>{" "}
                  have no packs yet — good areas to grow.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
