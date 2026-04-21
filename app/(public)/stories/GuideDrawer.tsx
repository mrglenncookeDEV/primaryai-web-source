"use client";

import styles from "./StoryBuilder.module.css";
import HomepageDiagram from "./guide/diagrams/HomepageDiagram";
import Step1Diagram from "./guide/diagrams/Step1Diagram";
import Step2Diagram from "./guide/diagrams/Step2Diagram";
import Step3Diagram from "./guide/diagrams/Step3Diagram";
import Step4Diagram from "./guide/diagrams/Step4Diagram";
import Step5Diagram from "./guide/diagrams/Step5Diagram";

// ── Small inline sub-components ──────────────────────────────────────────────

function Callout({ variant = "default", children }: { variant?: "tip" | "example" | "default"; children: React.ReactNode }) {
  const borderColor = variant === "tip" ? "var(--accent)" : variant === "example" ? "#3b82f6" : "var(--border)";
  return (
    <div style={{
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: "0 10px 10px 0",
      padding: "1rem 1.25rem",
      background: variant === "tip"
        ? "color-mix(in srgb, var(--accent) 6%, var(--field-bg))"
        : variant === "example"
          ? "color-mix(in srgb, #3b82f6 6%, var(--field-bg))"
          : "var(--field-bg)",
      marginBottom: "1rem",
      fontSize: "0.9375rem",
      lineHeight: 1.7,
      color: "var(--muted)",
    }}>
      {children}
    </div>
  );
}

function TipBox({ icon = "💡", children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: "0.75rem", alignItems: "flex-start",
      background: "color-mix(in srgb, var(--accent) 7%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
      borderRadius: "10px", padding: "0.875rem 1rem",
      marginBottom: "1rem",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
      <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.65 }}>{children}</p>
    </div>
  );
}

function SectionHeader({ num, title, subtitle }: { num: number; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "var(--accent)", color: "var(--accent-text, #042332)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "0.9375rem", fontFamily: "var(--font-mono, monospace)",
      }}>{num}</div>
      <div>
        <h3 style={{ margin: "0 0 0.2rem", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{title}</h3>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>{subtitle}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "2rem 0" }} />;
}

function FAQ({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "0.9375rem", color: "var(--text)" }}>{q}</p>
      <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7 }}>{a}</p>
    </div>
  );
}

const MOSCOW_CARDS = [
  { label: "Must have", desc: "Critical — launch cannot proceed without this", color: "#ef4444" },
  { label: "Should have", desc: "Important but not vital for launch", color: "#f97316" },
  { label: "Could have", desc: "Desirable but low impact if left out", color: "#3b82f6" },
  { label: "Won't have", desc: "Out of scope for this release", color: "#6b7280" },
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function GuideDrawer({ onClose }: Props) {
  return (
    <div className={styles.drawerInner}>
      {/* Top bar */}
      <div className={styles.drawerTopBar}>
        <button className={styles.drawerClose} onClick={onClose} aria-label="Close guide">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className={styles.drawerRef}>Story Builder Guide</span>
        <span />
      </div>

      {/* Scrollable body */}
      <div className={styles.drawerBody}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            color: "var(--accent)", borderRadius: 999,
            padding: "0.3rem 0.75rem", fontSize: "0.7rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem",
          }}>
            Story Builder Guide
          </div>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.2, color: "var(--text)" }}>
            How to contribute a user story for PrimaryAI
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
            A step-by-step guide for teachers, TAs, and school staff — no technical knowledge required.
            Each story you contribute helps shape which features get built next.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
            {[
              { icon: "⏱", label: "5 min read" },
              { icon: "📋", label: "5 steps" },
              { icon: "🔓", label: "No sign-in needed" },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                background: "var(--btn-bg)", border: "1px solid var(--border)",
                borderRadius: 999, padding: "0.25rem 0.75rem",
                fontSize: "0.8125rem", color: "var(--muted)",
              }}>
                {icon} {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Table of contents ── */}
        <nav aria-label="Guide sections" style={{ marginBottom: "2rem" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            In this guide
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
            {[
              { href: "#guide-what", label: "What is a user story?" },
              { href: "#guide-start", label: "Getting started" },
              { href: "#guide-step1", label: "Step 1 — Who" },
              { href: "#guide-step2", label: "Step 2 — What" },
              { href: "#guide-step3", label: "Step 3 — Why & Priority" },
              { href: "#guide-step4", label: "Step 4 — Criteria" },
              { href: "#guide-step5", label: "Step 5 — Review & Save" },
              { href: "#guide-tips", label: "Tips" },
              { href: "#guide-faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a key={href} href={href} style={{
                display: "block", padding: "0.5rem 0.75rem",
                background: "var(--btn-bg)", border: "1px solid var(--border)",
                borderRadius: "8px", textDecoration: "none",
                fontSize: "0.8125rem", color: "var(--muted)",
                transition: "border-color 0.15s, color 0.15s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)"; }}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <Divider />

        {/* ── What is a user story? ── */}
        <section id="guide-what" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.125rem", fontWeight: 700, color: "var(--text)" }}>
            What is a user story?
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
            A <strong style={{ color: "var(--text)" }}>user story</strong> is a short, plain-English description
            of a feature written from the perspective of the person who needs it. It follows a simple template:
          </p>
          <Callout variant="default">
            <span style={{ fontStyle: "italic", fontSize: "1rem", lineHeight: 1.8, color: "var(--text)" }}>
              As a <strong style={{ color: "var(--accent)" }}>[ who ]</strong>,
              I want to <strong style={{ color: "var(--accent)" }}>[ what ]</strong>,
              so that <strong style={{ color: "var(--accent)" }}>[ why ]</strong>.
            </span>
          </Callout>
          <Callout variant="example">
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#93c5fd" }}>Example</p>
            <span style={{ fontStyle: "italic", color: "var(--text)", lineHeight: 1.8 }}>
              As a <strong style={{ fontStyle: "normal", color: "#93c5fd" }}>Year 4 class teacher</strong>,
              I want to <em>automatically generate a differentiated lesson plan for three ability groups</em>,
              so that <em>I can reduce my weekly planning time from 4 hours to under 1 hour</em>.
            </span>
          </Callout>
          <TipBox>
            User stories are intentionally non-technical — you do not need to know how PrimaryAI works under the
            hood. Your job is to describe what you need and why. The development team handles the how.
          </TipBox>
        </section>

        <Divider />

        {/* ── Getting started ── */}
        <section id="guide-start" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.125rem", fontWeight: 700, color: "var(--text)" }}>
            Getting to the Story Builder
          </h2>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
            The Story Builder is publicly accessible — no account needed. You can reach it in two ways:
          </p>
          <HomepageDiagram />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--btn-bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🔗</span>
              <div>
                <p style={{ margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.875rem", color: "var(--text)" }}>Direct URL</p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)" }}>Go directly to <code style={{ color: "var(--accent)", background: "var(--field-bg)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>primaryai.org.uk/stories</code> in any browser.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--btn-bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🏠</span>
              <div>
                <p style={{ margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.875rem", color: "var(--text)" }}>From the homepage</p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)" }}>Click <strong style={{ color: "var(--text)" }}>Contribute to development</strong> on the PrimaryAI homepage.</p>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Step 1 ── */}
        <section id="guide-step1" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <SectionHeader num={1} title="Who is the user?" subtitle="Describe the specific person who needs this feature." />
          <Step1Diagram />
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              Choose a role from the quick-select chips or type a custom description in the text box.
              The chip is a starting point — the text box is where you get specific.
            </p>
            <TipBox icon="✏️">
              <strong style={{ color: "var(--text)" }}>Be specific.</strong> Instead of just "Teacher", try{" "}
              <em>"Year 3 class teacher with a mixed-ability cohort of 28 pupils"</em> or{" "}
              <em>"NQT in their first year of primary teaching"</em>. The more precise the role, the easier it
              is for the team to prioritise and design for.
            </TipBox>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { icon: "✅", text: "Year 6 teacher preparing pupils for SATs with a range of attainment levels" },
                { icon: "✅", text: "SENCO coordinating support across 3 year groups with varying EHCP requirements" },
                { icon: "❌", text: "Teacher (too vague — the more specific, the more useful)" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: "0.625rem", fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontStyle: text.startsWith("✅") || text.startsWith("❌") ? "inherit" : "italic" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Step 2 ── */}
        <section id="guide-step2" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <SectionHeader num={2} title="What do they want to do?" subtitle="Describe the action — not the feature." />
          <Step2Diagram />
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              Describe what the user wants to <em>do</em>, written as an action.
              Focus on the task, not on how the software would implement it.
            </p>
            <TipBox icon="🎯">
              <strong style={{ color: "var(--text)" }}>Describe the action, not the feature.</strong> Instead of{" "}
              <em>"use AI to help with planning"</em>, try{" "}
              <em>"automatically generate a differentiated worksheet for three ability groups in under 2 minutes"</em>.
              Focus on what the user does, not on what the system provides.
            </TipBox>
          </div>
        </section>

        <Divider />

        {/* ── Step 3 ── */}
        <section id="guide-step3" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <SectionHeader num={3} title="Why & Priority" subtitle="The benefit and how important it is." />
          <Step3Diagram />

          <div style={{ marginTop: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 700, color: "var(--text)" }}>The why</h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              Explain the real benefit — ideally with a number. A measurable benefit makes the story far easier to prioritise and verify once built.
            </p>
            <TipBox icon="📊">
              <strong style={{ color: "var(--text)" }}>Quantify where you can.</strong> Instead of{" "}
              <em>"save time"</em>, try <em>"reduce weekly planning from 4 hours to under 1 hour"</em>.
              Numbers give the team something concrete to aim for.
            </TipBox>

            <h3 style={{ margin: "1.25rem 0 0.75rem", fontSize: "0.875rem", fontWeight: 700, color: "var(--text)" }}>MoSCoW Priority</h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              Rate how important this story is using the MoSCoW framework:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "1rem" }}>
              {MOSCOW_CARDS.map(({ label, desc, color }) => (
                <div key={label} style={{
                  padding: "0.875rem 1rem", borderRadius: "10px",
                  border: `2px solid ${color}44`,
                  background: `${color}11`,
                }}>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "0.875rem", color }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.65 }}>
              Also set an <strong style={{ color: "var(--text)" }}>effort estimate</strong> (Small / Medium / Large / Not sure) — this helps the team plan sprints. Not sure is always fine.
            </p>
          </div>
        </section>

        <Divider />

        {/* ── Step 4 ── */}
        <section id="guide-step4" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <SectionHeader num={4} title="Acceptance Criteria" subtitle="How will you know when this is done?" />
          <Step4Diagram />
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              Acceptance criteria are the testable conditions that must be true for this story to be
              considered complete. They are optional, but highly recommended — stories with clear
              criteria are far more likely to be built correctly.
            </p>
            <TipBox icon="✅">
              <strong style={{ color: "var(--text)" }}>Write testable conditions.</strong> Each criterion should be something you can verify.
              Good examples: <em>"The user can export the plan as a PDF in one click"</em>,{" "}
              <em>"The generated plan covers all five learning objectives"</em>,{" "}
              <em>"Page loads in under 3 seconds on a standard school network"</em>.
              Aim for 3–5 criteria per story.
            </TipBox>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.65 }}>
              You can also add an optional <strong style={{ color: "var(--text)" }}>Notes</strong> field for
              context that doesn&apos;t fit anywhere else — SEND requirements, safeguarding constraints, offline
              access considerations, or any edge cases the team should know about.
            </p>
          </div>
        </section>

        <Divider />

        {/* ── Step 5 ── */}
        <section id="guide-step5" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <SectionHeader num={5} title="Review & Save" subtitle="Check the story and commit it to the backlog." />
          <Step5Diagram />
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              The review screen shows your complete story as it will appear in the backlog.
              Read through the sentence — does it clearly describe who, what, and why?
              Are the acceptance criteria specific enough to be testable?
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.7 }}>
              When you&apos;re happy, click <strong style={{ color: "var(--text)" }}>Save to backlog</strong>.
              Your story gets a unique reference number (e.g. <code style={{ color: "var(--accent)", background: "var(--field-bg)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>US-042</code>)
              and appears immediately in the list below the builder.
            </p>
            <TipBox icon="💾">
              You can <strong style={{ color: "var(--text)" }}>edit or delete</strong> any story after saving.
              Click any row in the backlog to open the detail panel, then use the Edit button in the top-right corner.
            </TipBox>
          </div>
        </section>

        <Divider />

        {/* ── Tips ── */}
        <section id="guide-tips" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700, color: "var(--text)" }}>
            Tips for writing great stories
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { icon: "👤", title: "Be specific about the who", body: "Generic roles like 'user' or 'teacher' are harder to prioritise. Include year group, experience level, or context where it helps." },
              { icon: "📊", title: "Quantify the why", body: "'Save time' is weak. 'Cut planning from 4 hours to 45 minutes each week' gives the team something measurable to aim for." },
              { icon: "✂️", title: "One goal per story", body: "If you find yourself writing 'and' in the What field, split it into two stories. Smaller stories are easier to build, test, and prioritise independently." },
              { icon: "✅", title: "Make criteria testable", body: "If you can't write a verifiable criterion for it, the story probably needs more thought before it gets built. 'Works well' is not testable. 'Loads in under 3 seconds' is." },
              { icon: "🏫", title: "Bring classroom context", body: "The team doesn't teach in primary schools. Every detail about your cohort, timetable constraints, SEND requirements, or marking load is valuable context they don't have." },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{
                display: "flex", gap: "1rem", alignItems: "flex-start",
                padding: "0.875rem 1rem",
                background: "var(--btn-bg)", border: "1px solid var(--border)",
                borderRadius: "10px",
              }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
                <div>
                  <p style={{ margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.875rem", color: "var(--text)" }}>{title}</p>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.65 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ margin: "1.75rem 0 0.75rem", fontSize: "0.875rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Weak vs strong — side by side
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ padding: "1rem", borderRadius: "10px", border: "1px solid #ef444444", background: "#ef444411" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em" }}>❌ Weak</p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.65 }}>
                As a teacher, I want to use AI, so that things are easier.
              </p>
            </div>
            <div style={{ padding: "1rem", borderRadius: "10px", border: "1px solid #4ade8044", background: "#4ade8011" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em" }}>✅ Strong</p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.65 }}>
                As a Year 4 SENCO, I want to generate a differentiated activity set for 3 ability groups in under 2 minutes, so that I can reduce my weekly planning from 4 hours to under 1 hour.
              </p>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── FAQ ── */}
        <section id="guide-faq" style={{ marginBottom: "2rem", scrollMarginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 700, color: "var(--text)" }}>
            Frequently asked questions
          </h2>
          <FAQ
            q="Do I need an account to submit a story?"
            a="No. The Story Builder is fully public — anyone can view, submit, edit, and delete stories without signing in. No personal data is required."
          />
          <FAQ
            q="Can I edit a story after saving?"
            a={<>Yes. Click any story in the backlog to open it, then hit <strong>Edit</strong> in the top-right of the panel. You can update any field and save your changes.</>}
          />
          <FAQ
            q="What does MoSCoW mean?"
            a={<>It&apos;s a prioritisation framework: <strong>Must have</strong> (critical for launch), <strong>Should have</strong> (important but not blocking), <strong>Could have</strong> (nice to have), and <strong>Won&apos;t have</strong> (out of scope for now). Picking honestly is more useful than always choosing Must have.</>}
          />
          <FAQ
            q="How many stories can I submit?"
            a="No limit — submit as many as you like. One idea per story works best so each one can be prioritised independently."
          />
          <FAQ
            q="What happens to my stories?"
            a="Stories go into the PrimaryAI product backlog. The team reviews them during sprint planning to decide what gets built next. High-priority, well-written stories with clear acceptance criteria are most likely to influence the roadmap."
          />
          <FAQ
            q="Does it matter what priority I pick?"
            a="Yes — but be honest rather than always selecting Must have. A realistic spread of priorities (some Must, some Should, some Could) gives the team much more useful signal than a backlog full of critical stories."
          />
          <FAQ
            q="I'm not a technical person. Is this still useful?"
            a="Absolutely — in fact, non-technical stories are often the most valuable. The dev team needs to know what teachers actually struggle with, not a list of features. Describe your problem; the team will figure out the solution."
          />
        </section>

        {/* ── CTA ── */}
        <div style={{
          background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
          borderRadius: "14px", padding: "1.75rem",
          textAlign: "center", marginBottom: "1rem",
        }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.0625rem", fontWeight: 700, color: "var(--text)" }}>
            Ready to contribute?
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.9375rem", color: "var(--muted)", lineHeight: 1.65 }}>
            The Story Builder is right here on this page. Close this guide and start with Step 1 — the whole process takes about 5 minutes.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--accent)", color: "var(--accent-text, #042332)",
              border: "none", borderRadius: "10px",
              padding: "0.75rem 1.75rem", fontSize: "0.9375rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Open the Story Builder →
          </button>
        </div>

      </div>
    </div>
  );
}
