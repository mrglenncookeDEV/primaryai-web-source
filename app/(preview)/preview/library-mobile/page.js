"use client";

const SUBJECTS = {
  Maths:"var(--accent)", English:"#7ba7c9", Science:"#6aab85",
  History:"#b8924a", Geography:"#5a9e85", Computing:"#8878b8",
  Music:"#b87898", Art:"#b8804a", PE:"#5a9eae",
};

const PACKS = [
  { subject:"Maths",     year:"Year 4", topic:"Fractions"            },
  { subject:"English",   year:"Year 3", topic:"Persuasive Writing"   },
  { subject:"Science",   year:"Year 5", topic:"Forces & Motion"      },
  { subject:"History",   year:"Year 2", topic:"Great Fire of London" },
  { subject:"Computing", year:"Year 6", topic:"Algorithms"           },
  { subject:"Geography", year:"Year 4", topic:"Rivers & Erosion"     },
  { subject:"Music",     year:"Year 3", topic:"Rhythm & Notation"    },
  { subject:"Art",       year:"Year 5", topic:"Printing Techniques"  },
];

const ANIM_DUR = "14s";
/* Tap target: 3rd card (Science) — approx y = 96+12+(2*(180+12))=96+12+384=492, x=195 */

export default function LibraryMobilePreview() {
  return (
    <div style={{ width:390, height:844, overflow:"hidden", background:"var(--bg)",
                  color:"var(--text)", fontFamily:"inherit",
                  display:"flex", flexDirection:"column", position:"relative" }}>

      <style>{`
        /* Content scrolls down then returns */
        @keyframes lmScroll {
          0%,10%       { transform:translateY(0); }
          45%,65%      { transform:translateY(-480px); }
          90%,100%     { transform:translateY(0); }
        }
        /* Finger-tap cursor on card 3 */
        @keyframes lmTap {
          0%,40%       { opacity:0; transform:translate(195px,492px) scale(1); }
          45%          { opacity:1; transform:translate(195px,492px) scale(1); }
          50%          { opacity:1; transform:translate(195px,492px) scale(0.88); }
          52%          { opacity:1; transform:translate(195px,492px) scale(1); }
          62%          { opacity:0; transform:translate(195px,492px) scale(1); }
          100%         { opacity:0; transform:translate(195px,492px) scale(1); }
        }
        /* Card 3 tap feedback */
        @keyframes lmCardTap {
          0%,46%       { background:var(--surface); transform:scale(1); }
          50%          { background:rgb(var(--accent-rgb) / 0.08); transform:scale(0.97); }
          54%,100%     { background:var(--surface); transform:scale(1); }
        }
      `}</style>

      {/* Finger tap indicator */}
      <div aria-hidden="true" style={{
        position:"absolute", zIndex:999, pointerEvents:"none",
        width:36, height:36, top:0, left:0,
        borderRadius:"50%",
        border:"2.5px solid rgba(255,255,255,0.7)",
        background:"rgba(255,255,255,0.15)",
        transform:"translate(-50%,-50%)",
        animation:`lmTap ${ANIM_DUR} ease-in-out infinite`,
      }}/>

      {/* Status bar */}
      <div style={{ height:44, minHeight:44, background:"var(--nav-bg)",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"0 1.2rem", fontSize:"0.7rem", fontWeight:700, color:"var(--text)" }}>
        <span>9:41</span>
        <span style={{ letterSpacing:"-0.02em" }}>●●●●</span>
      </div>

      {/* Nav */}
      <div style={{ height:52, minHeight:52, background:"var(--nav-bg)",
                    borderBottom:"1px solid var(--border)",
                    display:"flex", alignItems:"center", padding:"0 1rem", gap:"0.6rem" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10">
          <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15,0.7,-0.15,1,0 L21.5,7.5"
            stroke="var(--orange)" strokeWidth="1.7"/>
          <path d="M19.5,12 v6.5 c0,1.1,-0.9,2,-2,2 h-11 c-1.1,0,-2,-0.9,-2,-2 V12"
            stroke="currentColor" strokeWidth="1.7"/>
          <path d="M12,12 C9.5,10.2,6.5,10.2,4.5,12" stroke="currentColor" strokeWidth="1.7"/>
        </svg>
        <span style={{ fontWeight:800, fontSize:"0.95rem" }}>
          Pr<span style={{ color:"var(--orange)" }}>i</span>m
          <span style={{ color:"var(--orange)" }}>a</span>ry
          <span style={{ color:"var(--orange)" }}>A</span>
          <span style={{ color:"var(--orange)" }}>I</span>
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
        <div style={{ animation:`lmScroll ${ANIM_DUR} ease-in-out infinite`,
                      padding:"1rem" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center",
                        justifyContent:"space-between", marginBottom:"0.85rem" }}>
            <div>
              <h1 style={{ margin:0, fontSize:"1.25rem", fontWeight:800,
                           letterSpacing:"-0.02em" }}>Library</h1>
              <p style={{ margin:0, fontSize:"0.72rem", color:"var(--muted)" }}>
                24 lesson packs
              </p>
            </div>
            <button style={{ background:"var(--accent)", color:"#fff", border:"none",
                             borderRadius:9, padding:"0.45rem 0.85rem",
                             fontSize:"0.75rem", fontWeight:700,
                             fontFamily:"inherit", cursor:"default" }}>
              + New
            </button>
          </div>

          {/* Search */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                        background:"var(--surface)", border:"1px solid var(--border)",
                        borderRadius:10, padding:"0.5rem 0.8rem",
                        marginBottom:"0.85rem" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span style={{ fontSize:"0.78rem", color:"var(--muted)" }}>Search packs…</span>
          </div>

          {/* Pack cards */}
          {PACKS.map((pack, pi) => {
            const color = SUBJECTS[pack.subject] || "var(--muted)";
            const isTapped = pi === 2;
            return (
              <div key={pi} style={{
                borderRadius:14, overflow:"hidden",
                border:"1px solid var(--border-card)",
                marginBottom:"0.75rem",
                ...(isTapped
                  ? { animation:`lmCardTap ${ANIM_DUR} ease-in-out infinite` }
                  : { background:"var(--surface)" }),
              }}>
                <div style={{ height:4, background:color }}/>
                <div style={{ padding:"0.75rem 0.9rem", display:"flex",
                              alignItems:"center", gap:"0.75rem" }}>
                  <div style={{ width:40, height:40, borderRadius:10,
                                background:`${color}18`,
                                display:"flex", alignItems:"center",
                                justifyContent:"center",
                                flexShrink:0 }}>
                    <div style={{ width:16, height:16, borderRadius:4,
                                  background:color, opacity:0.7 }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:"0.85rem",
                                  overflow:"hidden", textOverflow:"ellipsis",
                                  whiteSpace:"nowrap" }}>
                      {pack.topic}
                    </div>
                    <div style={{ fontSize:"0.7rem", color:"var(--muted)",
                                  display:"flex", gap:"0.4rem", marginTop:"0.2rem" }}>
                      <span style={{ color,
                                     background:`${color}18`,
                                     borderRadius:4, padding:"0.05rem 0.35rem",
                                     fontSize:"0.62rem", fontWeight:700 }}>
                        {pack.subject}
                      </span>
                      <span>{pack.year}</span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round" style={{ color:"var(--muted)", flexShrink:0 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            );
          })}

          <div style={{ height:"2rem" }}/>
        </div>
      </div>

      {/* Bottom tab bar */}
      <div style={{ height:70, minHeight:70, background:"var(--nav-bg)",
                    borderTop:"1px solid var(--border)",
                    display:"flex", alignItems:"center", justifyContent:"space-around",
                    padding:"0 0.5rem 8px" }}>
        {[
          { label:"Home",    color:"var(--muted)", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
          { label:"Library", color:"var(--accent)", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
          { label:"New",     color:"var(--muted)", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg> },
        ].map(({ label, color, icon }) => (
          <div key={label} style={{ display:"flex", flexDirection:"column",
                                    alignItems:"center", gap:"0.2rem",
                                    color }}>
            {icon}
            <span style={{ fontSize:"0.6rem", fontWeight:600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
