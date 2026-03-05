"use client";

const SUBJECTS = {
  Maths:"var(--accent)", English:"#7ba7c9", Science:"#6aab85",
  History:"#b8924a", Geography:"#5a9e85", Computing:"#8878b8",
  Music:"#b87898", Art:"#b8804a", PE:"#5a9eae", PSHE:"#9878b0",
};

const PACKS = [
  { id:"1",  subject:"Maths",     year:"Year 4", topic:"Fractions",            date:"2 days ago" },
  { id:"2",  subject:"English",   year:"Year 3", topic:"Persuasive Writing",   date:"5 days ago" },
  { id:"3",  subject:"Science",   year:"Year 5", topic:"Forces & Motion",      date:"1 week ago" },
  { id:"4",  subject:"History",   year:"Year 2", topic:"Great Fire of London", date:"2 wks ago"  },
  { id:"5",  subject:"Computing", year:"Year 6", topic:"Algorithms",           date:"3 wks ago"  },
  { id:"6",  subject:"Geography", year:"Year 4", topic:"Rivers & Erosion",     date:"3 wks ago"  },
  { id:"7",  subject:"Music",     year:"Year 3", topic:"Rhythm & Notation",    date:"1 mo ago"   },
  { id:"8",  subject:"Art",       year:"Year 5", topic:"Printing Techniques",  date:"1 mo ago"   },
  { id:"9",  subject:"PE",        year:"Year 5", topic:"Athletics",            date:"1 mo ago"   },
  { id:"10", subject:"Maths",     year:"Year 1", topic:"Counting to 20",       date:"6 wks ago"  },
  { id:"11", subject:"English",   year:"Year 6", topic:"Narrative Writing",    date:"6 wks ago"  },
  { id:"12", subject:"PSHE",      year:"Year 4", topic:"Online Safety",        date:"2 mo ago"   },
];

const FILTERS = ["All","Maths","English","Science","History","Computing","Geography"];
/* cursor hovers pack #3 (Science) — 3rd card = index 2 */
const HOVER_IDX = 2;

function NavLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10">
      <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15,0.7,-0.15,1,0 L21.5,7.5"
        stroke="var(--orange)" strokeWidth="1.7"/>
      <path d="M19.5,12 v6.5 c0,1.1,-0.9,2,-2,2 h-11 c-1.1,0,-2,-0.9,-2,-2 V12"
        stroke="currentColor" strokeWidth="1.7"/>
      <path d="M12,12 C9.5,10.2,6.5,10.2,4.5,12" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

const SIDEBAR_ICONS = [
  { label:"Dashboard", active:false, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { label:"New Lesson",active:false, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  { label:"Library",   active:true,  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { label:"Settings",  active:false, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> },
];

const ANIM_DUR = "14s";

/*
 * Cursor target: the 3rd card (Science, id="3")
 * In a 4-col grid inside 1378-62-51=1265px content:
 *   col width ≈ (1265 - 3*20) / 4 ≈ 301px
 *   Card col 2 (0-indexed) left ≈ 62+26 + 2*(301+20) = 88+642 = 730px
 *   Card vertical: below toolbar (~140px from content top = 64+22+72=158px), card height ~160px
 *   Card centre y ≈ 158 + 80 = 238px
 *   Card centre x ≈ 730 + 150 = 880px
 */

export default function LibraryPreview() {
  return (
    <div style={{ display:"flex", flexDirection:"column", width:1440, height:900,
                  overflow:"hidden", background:"var(--bg)", color:"var(--text)",
                  fontFamily:"inherit", position:"relative" }}>

      <style>{`
        /* Cursor glides to card 3, hovers, clicks */
        @keyframes libCursor {
          0%          { opacity:0;   transform:translate(900px,100px); }
          8%          { opacity:1;   transform:translate(880px,238px); }  /* arrive at card */
          25%         { opacity:1;   transform:translate(880px,238px); }  /* hover */
          28%         { opacity:1;   transform:translate(876px,235px); }  /* click micro */
          35%         { opacity:1;   transform:translate(876px,235px); }
          /* move toward search bar */
          50%         { opacity:1;   transform:translate(680px,108px); }  /* search area */
          85%         { opacity:1;   transform:translate(680px,108px); }
          92%         { opacity:0;   transform:translate(680px,108px); }
          100%        { opacity:0;   transform:translate(900px,100px); }
        }
        /* Card lifts on hover */
        @keyframes libCardHover {
          0%,7%       { transform:translateY(0) scale(1);
                        box-shadow:none; }
          10%,33%     { transform:translateY(-8px) scale(1.02);
                        box-shadow:0 20px 48px rgba(0,0,0,0.2); }
          38%         { transform:translateY(0) scale(1);
                        box-shadow:none; }
          100%        { transform:translateY(0) scale(1);
                        box-shadow:none; }
        }
        /* Search text types in */
        @keyframes libSearchText {
          0%,40%      { width:0; }
          55%,82%     { width:9ch; }
          90%,100%    { width:0; }
        }
        /* Search cursor blink */
        @keyframes libCaret {
          0%,49%      { opacity:1; }
          50%,99%     { opacity:0; }
          100%        { opacity:1; }
        }
        /* Active filter chip slides */
        @keyframes libFilter {
          0%,38%      { transform:translateX(0); }
          50%,80%     { transform:translateX(74px); }  /* jumps to "Science" chip */
          90%,100%    { transform:translateX(0); }
        }
      `}</style>

      {/* Simulated cursor */}
      <div aria-hidden="true" style={{
        position:"absolute", zIndex:999, pointerEvents:"none",
        width:18, height:22, top:0, left:0,
        animation:`libCursor ${ANIM_DUR} ease-in-out infinite`,
      }}>
        <svg viewBox="0 0 18 22" width="18" height="22" fill="none">
          <path d="M2 2 L2 17 L6 12.5 L10 20 L12.5 18.8 L8.5 11.5 L15 11.5 Z"
            fill="white" stroke="#1a1a2e" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Nav */}
      <nav style={{ height:64, minHeight:64, display:"flex", alignItems:"center",
                    padding:"0 1.5rem", gap:"0.75rem", background:"var(--nav-bg)",
                    borderBottom:"1px solid var(--border)", zIndex:10 }}>
        <NavLogo />
        <span style={{ fontWeight:800, fontSize:"1.05rem" }}>
          Pr<span style={{ color:"var(--orange)" }}>i</span>m
          <span style={{ color:"var(--orange)" }}>a</span>ry
          <span style={{ color:"var(--orange)" }}>A</span>
          <span style={{ color:"var(--orange)" }}>I</span>
        </span>
        <div style={{ flex:1 }}/>
        <div style={{ width:34, height:34, borderRadius:"50%",
                      background:"rgb(var(--accent-rgb) / 0.15)", color:"var(--accent)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontWeight:700, fontSize:"0.82rem" }}>SJ</div>
      </nav>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Sidebar */}
        <aside style={{ width:62, minWidth:62, background:"var(--surface)",
                        borderRight:"1px solid var(--border)", display:"flex",
                        flexDirection:"column", alignItems:"center",
                        padding:"0.6rem 0", gap:"0.2rem" }}>
          {SIDEBAR_ICONS.map(({ label, active, icon }) => (
            <div key={label} style={{
              width:44, height:44, borderRadius:11,
              display:"flex", alignItems:"center", justifyContent:"center",
              color: active ? "var(--accent)" : "var(--muted)",
              background: active ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
            }}>{icon}</div>
          ))}
        </aside>

        {/* Content */}
        <div style={{ flex:1, overflow:"hidden", padding:"1.4rem 1.6rem",
                      display:"flex", flexDirection:"column", gap:"1rem" }}>

          {/* Page header */}
          <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
            <div>
              <h1 style={{ margin:0, fontSize:"1.5rem", fontWeight:800, letterSpacing:"-0.02em" }}>
                Lesson Library
              </h1>
              <p style={{ margin:0, fontSize:"0.78rem", color:"var(--muted)" }}>
                24 packs saved
              </p>
            </div>
            <div style={{ flex:1 }}/>
            {/* Animated search bar */}
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                          background:"var(--surface)", border:"1px solid var(--border)",
                          borderRadius:10, padding:"0.5rem 0.9rem",
                          fontSize:"0.82rem", color:"var(--muted)", minWidth:220 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span style={{ color:"var(--muted)", fontSize:"0.8rem" }}>Search packs… </span>
              {/* Typing text */}
              <span style={{ overflow:"hidden", display:"inline-block", whiteSpace:"nowrap",
                             color:"var(--text)", fontWeight:500,
                             animation:`libSearchText ${ANIM_DUR} steps(9) infinite` }}>
                fractions
              </span>
              {/* Blinking caret */}
              <span style={{ width:1.5, height:14, background:"var(--accent)",
                             display:"inline-block", marginLeft:1,
                             animation:`libCaret 0.9s step-end infinite` }}/>
            </div>
            <button style={{ background:"var(--accent)", color:"#fff", border:"none",
                             borderRadius:10, padding:"0.55rem 1.1rem",
                             fontSize:"0.82rem", fontWeight:700,
                             fontFamily:"inherit", cursor:"default" }}>
              + New Pack
            </button>
          </div>

          {/* Filter chips */}
          <div style={{ display:"flex", gap:"0.5rem", position:"relative" }}>
            {FILTERS.map((f, fi) => (
              <div key={f} style={{
                padding:"0.3rem 0.85rem", borderRadius:20, fontSize:"0.75rem", fontWeight:600,
                background: fi === 0 ? "rgb(var(--accent-rgb) / 0.14)" : "var(--surface)",
                color: fi === 0 ? "var(--accent)" : "var(--muted)",
                border: fi === 0 ? "1px solid rgb(var(--accent-rgb) / 0.35)" : "1px solid var(--border)",
              }}>{f}</div>
            ))}
          </div>

          {/* Pack grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1.1rem",
                        flex:1, alignContent:"start", overflow:"hidden" }}>
            {PACKS.map((pack, pi) => {
              const color = SUBJECTS[pack.subject] || "var(--muted)";
              const isHovered = pi === HOVER_IDX;
              return (
                <div key={pack.id} style={{
                  background:"var(--surface)",
                  borderRadius:14,
                  border:"1px solid var(--border-card)",
                  overflow:"hidden",
                  display:"flex", flexDirection:"column",
                  cursor:"default",
                  ...(isHovered ? { animation:`libCardHover ${ANIM_DUR} ease-in-out infinite` } : {}),
                }}>
                  {/* Subject stripe */}
                  <div style={{ height:4, background:color }}/>
                  {/* Body */}
                  <div style={{ padding:"0.8rem 0.9rem", flex:1, display:"flex",
                                flexDirection:"column", gap:"0.4rem" }}>
                    <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                      <span style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.04em",
                                     textTransform:"uppercase", color,
                                     background:`${color}18`, borderRadius:5,
                                     padding:"0.1rem 0.4rem" }}>
                        {pack.subject}
                      </span>
                      <span style={{ fontSize:"0.62rem", fontWeight:600,
                                     color:"var(--muted)", background:"var(--border)",
                                     borderRadius:5, padding:"0.1rem 0.4rem" }}>
                        {pack.year}
                      </span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:"0.82rem", lineHeight:1.35,
                                  color:"var(--text)" }}>
                      {pack.topic}
                    </div>
                    <div style={{ fontSize:"0.68rem", color:"var(--muted)", marginTop:"auto" }}>
                      {pack.date}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display:"flex", borderTop:"1px solid var(--border)",
                                padding:"0.45rem 0.7rem", gap:"0.5rem" }}>
                    <button style={{ flex:1, background:"transparent", border:"none",
                                     color:"var(--muted)", fontSize:"0.7rem", fontWeight:600,
                                     fontFamily:"inherit", cursor:"default",
                                     padding:"0.2rem 0" }}>
                      View
                    </button>
                    <button style={{ flex:1, background:`${color}18`, border:`1px solid ${color}40`,
                                     color, fontSize:"0.7rem", fontWeight:600,
                                     fontFamily:"inherit", borderRadius:6,
                                     cursor:"default", padding:"0.2rem 0" }}>
                      Schedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
