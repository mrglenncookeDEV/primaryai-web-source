import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/marketing/Nav";

export const metadata = {
  title: "User Guide | PrimaryAI",
  description: "Step-by-step guide to using PrimaryAI for lesson planning, scheduling, library management, notes, and settings.",
};

const QUICK_START_STEPS = [
  {
    icon: "⚙️",
    title: "Set up your teaching profile",
    body: "Go to Settings and add your year group, class notes, attainment split, and any SEND or EAL context. The more specific you are here, the more relevant everything generated for you will be.",
  },
  {
    icon: "📅",
    title: "Plan your week in the scheduler",
    body: "Use the Dashboard scheduler to map out your teaching week. You can add events manually or use the AI Planner to generate a draft schedule from a rough description or curriculum document.",
  },
  {
    icon: "📦",
    title: "Generate your first lesson pack",
    body: "Open the Lesson Pack Generator, pick your year group, subject, and a focused topic. Optionally upload a planning document. Review the draft carefully — objectives, activities, SEND notes, and assessment questions.",
  },
  {
    icon: "📚",
    title: "Save and organise in the Library",
    body: "Save any lesson pack you want to reuse. Use folders to separate long-term curriculum resources from day-to-day materials. Attach packs directly to schedule events to keep everything linked.",
  },
  {
    icon: "📝",
    title: "Use Notes to capture ideas as you work",
    body: "Notes lives across the whole app. Jot down lesson ideas, observations, or planning thoughts as they come. Attach notes to specific lesson packs or schedule events so context stays where you need it.",
  },
];

const GUIDE_SECTIONS = [
  {
    id: "dashboard",
    title: "Dashboard and weekly view",
    icon: "🗓️",
    image: "/images/landing/dashboard-current.png",
    alt: "PrimaryAI dashboard showing weekly timetable and planning tools",
    body: "The dashboard is your daily starting point. It shows your timetable for the week, gives you quick access to AI planning tools, and surfaces what needs attention today. Start here before opening anything else.",
    bullets: [
      "Check your week view before generating anything new — avoid duplicating lessons you already have.",
      "Use the week and month toggle to get the right level of detail for your planning horizon.",
      "Click any scheduled event to view attached resources, edit details, or open linked lesson packs.",
      "The AI tools on the dashboard are designed for quick review first, commit second — treat all suggestions as drafts.",
    ],
  },
  {
    id: "lesson-packs",
    title: "Generating lesson packs",
    icon: "📦",
    image: "/images/landing/home-laptop-current.png",
    alt: "PrimaryAI lesson pack generator and result view",
    body: "Lesson packs are the core output — a complete teaching resource with objectives, a teacher explanation, differentiated activities, common misconceptions, and a mini assessment. The generator works best when your inputs are specific.",
    bullets: [
      "Choose a focused topic rather than a broad unit name. 'Equivalent fractions' is better than 'fractions'.",
      "Upload a curriculum plan or SEN context document when it would genuinely improve the output.",
      "Review every section before saving — check that objectives are measurable, differentiation is meaningful, and the explanation is accurate.",
      "Use targeted regeneration to fix individual sections rather than rewriting from scratch.",
      "Save strong packs to the Library so you can reuse and adapt them next year.",
    ],
  },
  {
    id: "ai-planner",
    title: "AI Planner and smart scheduling",
    icon: "🤖",
    image: "/images/landing/scheduler-term-current.png",
    alt: "PrimaryAI term schedule planner showing AI-generated timetable",
    body: "The AI Planner turns rough descriptions and curriculum documents into draft timetable entries. Use it to get a first pass at your week or term, then edit from there. It is a starting point, not a finished plan.",
    bullets: [
      "Smart Plan generates a draft week from a short description — great for quickly roughing out a new half-term.",
      "Term Plan distributes lessons across the term from a curriculum overview document.",
      "Gap Check flags subjects that may be under-covered over the coming weeks.",
      "Always review timing, subject balance, and missing events before saving anything to your live schedule.",
    ],
  },
  {
    id: "library",
    title: "Library and resource management",
    icon: "📚",
    image: "/images/landing/library-current.png",
    alt: "PrimaryAI library showing saved lesson packs, documents and notes",
    body: "The Library holds everything you have saved or uploaded — lesson packs, documents, and notes. Use it as your permanent teaching resource store, organised into folders that match how you actually work.",
    bullets: [
      "Organise with folders: keep long-term curriculum packs separate from in-the-moment resources.",
      "Upload your own lesson files when you already have a finished resource you want in the timetable.",
      "Notes appear in the library alongside packs and documents so you can keep related material together.",
      "Open any resource to preview it, move it to a folder, or attach it to a schedule event.",
    ],
  },
  {
    id: "notes",
    title: "Notes and lesson annotations",
    icon: "📝",
    image: "/images/landing/notes-current.png",
    alt: "PrimaryAI notes editor with yellow writing area",
    body: "Notes gives you a distraction-free space to capture ideas, reflections, and planning thoughts. Notes can be standalone, or attached directly to a lesson pack or schedule event — keeping context where it belongs.",
    bullets: [
      "Paste images directly into notes to embed them inline — useful for adding diagrams, photos of student work, or resource screenshots.",
      "Attach a note to a lesson pack to keep your planning thoughts alongside the resource.",
      "Use the pin feature to keep important notes at the top of your list.",
      "Notes are searchable and stored in your library so you can find them alongside lesson packs and documents.",
      "The yellow writing area is designed to be easy on the eyes during longer planning sessions.",
    ],
  },
  {
    id: "mobile",
    title: "Mobile access and quick checks",
    icon: "📱",
    image: "/images/landing/home-mobile-current.png",
    alt: "PrimaryAI on a mobile phone showing schedule and resources",
    body: "PrimaryAI works on mobile for quick checks and lightweight updates. Use it to review your schedule, check a saved resource, or jot a quick note. Keep heavy generation and detailed review on desktop.",
    bullets: [
      "Mobile is best for checking your day, reviewing what is coming up, and reading saved lesson packs.",
      "Quick notes work well on mobile — useful for capturing an observation or idea during the day.",
      "The bottom dock gives fast access to your most-used areas without needing to navigate menus.",
    ],
  },
  {
    id: "settings",
    title: "Settings and class profile",
    icon: "⚙️",
    image: "/images/landing/scheduler-month-current.png",
    alt: "PrimaryAI settings and monthly schedule view",
    body: "Settings shape how useful the whole app becomes. A well-completed class profile means lesson packs, AI planning suggestions, and scheduling tools all reflect your actual teaching context.",
    bullets: [
      "Complete your year group, class notes, attainment split, and any SEND or EAL context before relying on generation.",
      "Keep attainment percentages current — they directly affect how differentiated activities are calibrated.",
      "Add your term dates so countdowns, planning views, and schedule generation stay accurate.",
      "Connect Google Calendar or Outlook if you want to see school events alongside your generated timetable.",
    ],
  },
];

const TIPS = [
  { label: "Generation", tip: "Use specific topics instead of broad labels. 'Equivalent fractions Year 4' is better than 'fractions'." },
  { label: "Uploads", tip: "Upload only context that materially improves the output. More text is not always better — a focused SEN summary beats a whole EHCP." },
  { label: "Review", tip: "Review every AI output before saving, exporting, or teaching from it. Check objectives are measurable and explanations are accurate." },
  { label: "Regeneration", tip: "Use targeted regeneration to fix one section rather than rewriting everything. Be specific about what needs to change." },
  { label: "Library", tip: "Store reviewed resources in the Library. Over time you build a reusable bank of quality teaching material." },
  { label: "Profile", tip: "Update your class profile at the start of each term. Changes to your cohort should be reflected in your settings." },
];

export default function GuidePage() {
  return (
    <>
      <Nav />
      <div className="app-body">
        <aside className="app-sidebar" aria-hidden="true" />
        <div className="app-content">
          <main className="page-wrap" style={{ paddingBottom: "4rem" }}>

            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section
              style={{
                display: "grid",
                gap: "1.5rem",
                gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.9fr)",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  background: "rgb(var(--accent-rgb) / 0.1)", color: "var(--accent)",
                  borderRadius: "999px", padding: "0.3rem 0.8rem",
                  fontSize: "0.72rem", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  marginBottom: "0.9rem",
                }}>
                  User Guide
                </div>
                <h1 style={{ margin: "0 0 0.7rem", fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.02, letterSpacing: "-0.04em" }}>
                  PrimaryAI from setup to daily use
                </h1>
                <p style={{ margin: "0 0 1.25rem", fontSize: "1rem", lineHeight: 1.75, color: "var(--muted)", maxWidth: "56ch" }}>
                  This guide walks through the core workflow: setting up your teaching profile, planning your timetable, generating lesson packs, capturing ideas in Notes, and managing your resources.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href="/signup" className="nav-btn-cta">
                    Start with PrimaryAI
                  </Link>
                  <Link href="#quick-start" className="nav-btn-ghost">
                    Jump to quick start
                  </Link>
                </div>
              </div>

              <div className="card" style={{ padding: "0.9rem", overflow: "hidden" }}>
                <Image
                  src="/images/landing/dashboard-final.png"
                  alt="PrimaryAI dashboard overview"
                  width={1400}
                  height={980}
                  style={{ width: "100%", height: "auto", borderRadius: "14px", display: "block" }}
                  priority
                />
              </div>
            </section>

            {/* ── Quick start ──────────────────────────────────────────── */}
            <section className="card" id="quick-start" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginTop: 0 }}>Quick start</h2>
              <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {QUICK_START_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    style={{
                      border: "1px solid var(--border)", borderRadius: "14px",
                      padding: "1rem", background: "var(--field-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.6rem" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "999px",
                        background: "rgb(var(--accent-rgb) / 0.15)", color: "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: "0.8rem", flexShrink: 0,
                      }}>
                        {index + 1}
                      </div>
                      <span style={{ fontSize: "1.15rem" }}>{step.icon}</span>
                    </div>
                    <h3 style={{ margin: "0 0 0.45rem", fontSize: "0.95rem" }}>{step.title}</h3>
                    <p className="muted" style={{ margin: 0, lineHeight: 1.65, fontSize: "0.88rem" }}>{step.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── What's inside ────────────────────────────────────────── */}
            <section className="card" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginTop: 0 }}>What's inside this guide</h2>
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                {GUIDE_SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    style={{
                      display: "flex", flexDirection: "column", gap: "0.35rem",
                      padding: "0.85rem 1rem", borderRadius: "14px",
                      border: "1px solid var(--border)", textDecoration: "none",
                      color: "var(--text)", background: "var(--field-bg)",
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>{section.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{section.title}</span>
                  </a>
                ))}
              </div>
            </section>

            {/* ── Guide sections ───────────────────────────────────────── */}
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {GUIDE_SECTIONS.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="card"
                  style={{
                    display: "grid",
                    gap: "1.2rem",
                    gridTemplateColumns:
                      index % 2 === 0
                        ? "minmax(0, 1.1fr) minmax(280px, 0.9fr)"
                        : "minmax(280px, 0.9fr) minmax(0, 1.1fr)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ order: index % 2 === 0 ? 1 : 2 }}>
                    <p style={{
                      margin: "0 0 0.35rem",
                      fontSize: "0.72rem", fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: "var(--accent)",
                    }}>
                      Section {index + 1}
                    </p>
                    <h2 style={{ margin: "0 0 0.55rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>{section.icon}</span> {section.title}
                    </h2>
                    <p className="muted" style={{ margin: "0 0 0.9rem", lineHeight: 1.75 }}>
                      {section.body}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet} style={{ marginBottom: "0.45rem", lineHeight: 1.65 }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ order: index % 2 === 0 ? 2 : 1 }}>
                    <div style={{
                      border: "1px solid var(--border)", borderRadius: "16px",
                      overflow: "hidden", background: "var(--field-bg)",
                    }}>
                      <Image
                        src={section.image}
                        alt={section.alt}
                        width={1400}
                        height={980}
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {/* ── Tips ─────────────────────────────────────────────────── */}
            <section className="card" style={{ marginTop: "1.5rem" }}>
              <h2 style={{ marginTop: 0 }}>Best-practice tips</h2>
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {TIPS.map((tip) => (
                  <div
                    key={tip.label}
                    style={{
                      border: "1px solid var(--border)", borderRadius: "14px",
                      padding: "0.95rem", background: "var(--field-bg)", lineHeight: 1.65,
                    }}
                  >
                    <div style={{
                      fontSize: "0.68rem", fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "var(--accent)", marginBottom: "0.4rem",
                    }}>
                      {tip.label}
                    </div>
                    {tip.tip}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Need help next? ───────────────────────────────────────── */}
            <section className="card" style={{ marginTop: "1.5rem" }}>
              <h2 style={{ marginTop: 0 }}>Need help next?</h2>
              <p className="muted" style={{ lineHeight: 1.75 }}>
                If you want to get started immediately, create an account and begin with your profile setup. Read the FAQ for quick answers to common questions, or contact us if you need support or want to discuss rollout in your school.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Link href="/signup" className="nav-btn-cta">
                  Create an account
                </Link>
                <Link href="/faq" className="nav-btn-ghost">
                  Read the FAQ
                </Link>
                <Link href="/contact" className="nav-btn-ghost">
                  Contact support
                </Link>
              </div>
            </section>

          </main>
        </div>
      </div>
    </>
  );
}
