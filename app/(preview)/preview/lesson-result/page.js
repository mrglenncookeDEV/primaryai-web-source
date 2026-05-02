"use client";

/* Lesson-pack result page — desktop 1440×900, auto-scrolls through sections */

const PACK = {
  year:"Year 4", subject:"Maths", topic:"Fractions",
  objectives:[
    "Recognise and show equivalent fractions using diagrams and number lines",
    "Add and subtract fractions with the same denominator",
    "Solve problems involving fractions of amounts and quantities",
  ],
  teacherNote:"Begin with concrete resources — fraction walls and circles before abstract notation. Emphasise that the denominator names the number of equal parts the whole is divided into. Use bar models throughout.",
  activities:{
    support:"Match fraction cards to shaded diagrams. Use fraction walls to compare ¼, ½ and ¾ and order on a number line.",
    expected:"Order fractions on a number line. Add and subtract fractions with the same denominator using bar models and written methods.",
    depth:"Investigate equivalent fractions and justify reasoning using at least two representations. Extend to fractions greater than 1.",
  },
  misconceptions:[
    "Believing larger denominator = larger fraction (e.g. ⅛ > ½)",
    "Adding numerators and denominators when finding equivalent fractions",
  ],
  slides:[
    { title:"What is a Fraction?",        bullets:["Parts of a whole","Numerator & denominator","Real-life examples"] },
    { title:"Equivalent Fractions",       bullets:["Fraction wall activity","Multiply/divide to find equivalents","Spot the pattern"] },
    { title:"Adding Same Denominators",   bullets:["Bar model method","Worked example: ⅜ + ⅜","Pair practice"] },
    { title:"Plenary & Assessment",       bullets:["Exit ticket questions","Peer-mark","Self-assessment traffic light"] },
  ],
  questions:["What is ⅜ + ⅜?","Write two fractions equivalent to ½.","A pizza is cut into 8 slices. Sam eats 3. What fraction remains?"],
};

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

const ANIM_DUR = "18s";

export default function LessonResultPreview() {
  return (
    <div style={{ display:"flex", flexDirection:"column", width:1440, height:900,
                  overflow:"hidden", background:"var(--bg)", color:"var(--text)",
                  fontFamily:"inherit", position:"relative" }}>

      <style>{`
        /* Main content auto-scrolls down then back */
        @keyframes lrScroll {
          0%,8%        { transform:translateY(0); }
          40%,58%      { transform:translateY(-520px); }
          88%,100%     { transform:translateY(0); }
        }
        /* Cursor moves down the page following the scroll */
        @keyframes lrCursor {
          0%           { opacity:0; transform:translate(700px, 200px); }
          6%           { opacity:1; transform:translate(700px, 200px); }
          38%          { opacity:1; transform:translate(700px, 680px); }
          55%          { opacity:1; transform:translate(700px, 680px); }
          /* click "Show answer" on Q1 */
          57%          { opacity:1; transform:translate(486px,678px); }
          59%          { opacity:1; transform:translate(482px,674px); }
          62%          { opacity:1; transform:translate(482px,674px); }
          80%          { opacity:0; transform:translate(482px,674px); }
          100%         { opacity:0; transform:translate(700px, 200px); }
        }
        /* Q1 answer reveals on "click" */
        @keyframes lrAnswer {
          0%,60%       { opacity:0; max-height:0; }
          65%,82%      { opacity:1; max-height:60px; }
          88%,100%     { opacity:0; max-height:0; }
        }
        /* Slides carousel subtly scrolls */
        @keyframes lrSlides {
          0%,30%       { transform:translateX(0); }
          55%,70%      { transform:translateX(-290px); }
          85%,100%     { transform:translateX(0); }
        }
      `}</style>

      {/* Cursor */}
      <div aria-hidden="true" style={{
        position:"absolute", zIndex:999, pointerEvents:"none",
        width:18, height:22, top:0, left:0,
        animation:`lrCursor ${ANIM_DUR} ease-in-out infinite`,
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
          {[
            <svg key="d" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
            <svg key="l" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
            <svg key="b" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
          ].map((icon, i) => (
            <div key={i} style={{
              width:44, height:44, borderRadius:11,
              display:"flex", alignItems:"center", justifyContent:"center",
              color: i === 1 ? "var(--accent)" : "var(--muted)",
              background: i === 1 ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
            }}>{icon}</div>
          ))}
        </aside>

        {/* Content — scrollable container */}
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          {/* Scrolling inner */}
          <div style={{ padding:"1.5rem 2rem",
                        animation:`lrScroll ${ANIM_DUR} ease-in-out infinite` }}>

            {/* Pack header */}
            <div style={{ display:"flex", alignItems:"flex-start",
                          justifyContent:"space-between", marginBottom:"1.5rem" }}>
              <div>
                <div style={{ display:"flex", gap:"0.5rem", marginBottom:"0.6rem" }}>
                  {[PACK.year, PACK.subject].map(t => (
                    <span key={t} style={{ fontSize:"0.7rem", fontWeight:700,
                                          background:"rgb(var(--accent-rgb) / 0.14)",
                                          color:"var(--accent)", borderRadius:7,
                                          padding:"0.2rem 0.6rem" }}>{t}</span>
                  ))}
                </div>
                <h1 style={{ margin:0, fontSize:"1.8rem", fontWeight:800,
                             letterSpacing:"-0.03em" }}>{PACK.topic}</h1>
                <p style={{ margin:"0.3rem 0 0", fontSize:"0.8rem",
                            color:"var(--muted)" }}>AI-generated lesson pack</p>
              </div>
              <div style={{ display:"flex", gap:"0.75rem" }}>
                {["Save to Library","Export","Schedule"].map((lbl, i) => (
                  <button key={lbl} style={{
                    background: i === 2 ? "var(--accent)" : "var(--surface)",
                    color: i === 2 ? "#fff" : "var(--muted)",
                    border: i === 2 ? "none" : "1px solid var(--border)",
                    borderRadius:10, padding:"0.55rem 1rem",
                    fontSize:"0.8rem", fontWeight:700,
                    fontFamily:"inherit", cursor:"default",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Two-col layout */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>

              {/* Left col */}
              <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>

                {/* Objectives */}
                <section style={{ background:"var(--surface)", borderRadius:16,
                                  border:"1px solid var(--border-card)", padding:"1rem 1.2rem" }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em",
                                textTransform:"uppercase", color:"var(--accent)",
                                marginBottom:"0.75rem" }}>
                    Learning Objectives
                  </div>
                  {PACK.objectives.map((o, i) => (
                    <div key={i} style={{ display:"flex", gap:"0.65rem",
                                          marginBottom: i<2 ? "0.6rem" : 0 }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0,
                                    background:"rgb(var(--accent-rgb) / 0.14)",
                                    color:"var(--accent)", fontSize:"0.62rem", fontWeight:800,
                                    display:"flex", alignItems:"center",
                                    justifyContent:"center", marginTop:2 }}>{i+1}</div>
                      <p style={{ margin:0, fontSize:"0.82rem",
                                  lineHeight:1.55, color:"var(--text)" }}>{o}</p>
                    </div>
                  ))}
                </section>

                {/* Teacher explanation */}
                <section style={{ background:"var(--surface)", borderRadius:16,
                                  border:"1px solid var(--border-card)", padding:"1rem 1.2rem",
                                  borderLeft:"3px solid var(--accent)" }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em",
                                textTransform:"uppercase", color:"var(--accent)",
                                marginBottom:"0.75rem" }}>
                    Teacher Explanation
                  </div>
                  <p style={{ margin:0, fontSize:"0.82rem",
                              lineHeight:1.65, color:"var(--text)" }}>
                    {PACK.teacherNote}
                  </p>
                </section>

                {/* Common misconceptions */}
                <section style={{ background:"var(--surface)", borderRadius:16,
                                  border:"1px solid var(--border-card)", padding:"1rem 1.2rem" }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em",
                                textTransform:"uppercase", color:"#b8924a",
                                marginBottom:"0.75rem" }}>
                    Common Misconceptions
                  </div>
                  {PACK.misconceptions.map((m, i) => (
                    <div key={i} style={{ display:"flex", gap:"0.6rem",
                                          marginBottom: i<1 ? "0.5rem" : 0 }}>
                      <span style={{ color:"#b8924a", fontWeight:800,
                                     fontSize:"0.9rem", flexShrink:0 }}>⚠</span>
                      <p style={{ margin:0, fontSize:"0.8rem",
                                  lineHeight:1.55, color:"var(--text)" }}>{m}</p>
                    </div>
                  ))}
                </section>
              </div>

              {/* Right col */}
              <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>

                {/* Differentiated activities */}
                <section style={{ background:"var(--surface)", borderRadius:16,
                                  border:"1px solid var(--border-card)", padding:"1rem 1.2rem" }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em",
                                textTransform:"uppercase", color:"var(--accent)",
                                marginBottom:"0.75rem" }}>
                    Differentiated Activities
                  </div>
                  {[
                    { tier:"Support",      content:PACK.activities.support, color:"#7ba7c9" },
                    { tier:"Expected",     content:PACK.activities.expected, color:"var(--accent)" },
                    { tier:"Greater Depth",content:PACK.activities.depth,   color:"#8878b8" },
                  ].map(({ tier, content, color }) => (
                    <div key={tier} style={{ background:`${color}14`,
                                             border:`1px solid ${color}30`,
                                             borderRadius:10, padding:"0.65rem 0.8rem",
                                             marginBottom:"0.65rem" }}>
                      <div style={{ fontSize:"0.62rem", fontWeight:800, color,
                                    letterSpacing:"0.06em", textTransform:"uppercase",
                                    marginBottom:"0.3rem" }}>{tier}</div>
                      <p style={{ margin:0, fontSize:"0.78rem",
                                  lineHeight:1.55, color:"var(--text)" }}>{content}</p>
                    </div>
                  ))}
                </section>

                {/* Presentation slides */}
                <section style={{ background:"var(--surface)", borderRadius:16,
                                  border:"1px solid var(--border-card)", padding:"1rem 1.2rem" }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em",
                                textTransform:"uppercase", color:"var(--accent)",
                                marginBottom:"0.75rem" }}>
                    Presentation Slides
                  </div>
                  <div style={{ overflow:"hidden" }}>
                    <div style={{ display:"flex", gap:"0.75rem",
                                  animation:`lrSlides ${ANIM_DUR} ease-in-out infinite` }}>
                      {PACK.slides.map((s, i) => (
                        <div key={i} style={{ minWidth:240, background:"var(--bg)",
                                             border:"1px solid var(--border-card)",
                                             borderRadius:10, overflow:"hidden",
                                             flexShrink:0 }}>
                          <div style={{ background:"rgb(var(--accent-rgb) / 0.07)",
                                        borderBottom:"1px solid var(--border-card)",
                                        padding:"0.5rem 0.75rem", display:"flex",
                                        alignItems:"center", gap:"0.45rem" }}>
                            <span style={{ fontSize:"0.6rem", fontWeight:800,
                                           background:"var(--border)", color:"var(--muted)",
                                           borderRadius:4, padding:"0.1rem 0.35rem" }}>
                              {i+1}
                            </span>
                            <span style={{ fontSize:"0.78rem", fontWeight:700,
                                           color:"var(--text)" }}>{s.title}</span>
                          </div>
                          <ul style={{ margin:0, padding:"0.6rem 0.75rem 0.6rem 1.4rem",
                                       fontSize:"0.74rem", color:"var(--muted)",
                                       lineHeight:1.6 }}>
                            {s.bullets.map((b,bi) => <li key={bi}>{b}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Mini assessment */}
                <section style={{ background:"var(--surface)", borderRadius:16,
                                  border:"1px solid var(--border-card)", padding:"1rem 1.2rem" }}>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em",
                                textTransform:"uppercase", color:"var(--accent)",
                                marginBottom:"0.75rem" }}>
                    Mini Assessment
                  </div>
                  {PACK.questions.map((q, i) => (
                    <div key={i} style={{ display:"flex", gap:"0.6rem",
                                          marginBottom: i<2 ? "0.75rem" : 0 }}>
                      <div style={{ width:20, height:20, borderRadius:"50%",
                                    background:"rgb(var(--accent-rgb) / 0.14)",
                                    color:"var(--accent)", fontSize:"0.6rem", fontWeight:800,
                                    display:"flex", alignItems:"center",
                                    justifyContent:"center", flexShrink:0, marginTop:2 }}>
                        Q{i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 0.35rem", fontSize:"0.8rem",
                                    lineHeight:1.55, color:"var(--text)" }}>{q}</p>
                        {/* Q1 answer reveals on simulated click */}
                        {i === 0 && (
                          <>
                            <button style={{ fontSize:"0.7rem", color:"var(--muted)",
                                             background:"transparent",
                                             border:"1px solid var(--border)",
                                             borderRadius:6, padding:"0.2rem 0.55rem",
                                             fontFamily:"inherit", cursor:"default" }}>
                              Show answer
                            </button>
                            <div style={{
                              overflow:"hidden",
                              animation:`lrAnswer ${ANIM_DUR} ease-in-out infinite`,
                            }}>
                              <p style={{ margin:"0.4rem 0 0", fontSize:"0.78rem",
                                          color:"#6aab85", padding:"0.35rem 0.65rem",
                                          background:"rgba(106,171,133,0.08)",
                                          border:"1px solid rgba(106,171,133,0.2)",
                                          borderRadius:7 }}>
                                ¾ (six eighths)
                              </p>
                            </div>
                          </>
                        )}
                        {i > 0 && (
                          <button style={{ fontSize:"0.7rem", color:"var(--muted)",
                                           background:"transparent",
                                           border:"1px solid var(--border)",
                                           borderRadius:6, padding:"0.2rem 0.55rem",
                                           fontFamily:"inherit", cursor:"default" }}>
                            Show answer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>

              </div>
            </div>

          </div>{/* end scrolling inner */}
        </div>
      </div>
    </div>
  );
}
