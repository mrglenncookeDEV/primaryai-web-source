import Nav from "@/components/marketing/Nav";
import Link from "next/link";

export const metadata = {
  title: "Compliance & Data Protection — PrimaryAI",
  description: "How PrimaryAI handles data protection, AI safety, and UK GDPR compliance for schools.",
};

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
      <circle cx="8" cy="8" r="7.25" stroke="#4ade80" strokeWidth="1.5" />
      <path d="M5 8l2.5 2.5L11 5.5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", marginTop: "0.25rem" }}>
      <h2 style={{ margin: "0 0 1rem", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h2>
      {children}
    </section>
  );
}

function CheckList({ items }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.6rem" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", fontSize: "0.88rem", lineHeight: 1.55 }}>
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Provider({ name, model, link, dpa }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem",
      padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--field-bg)",
      flexWrap: "wrap",
    }}>
      <div>
        <p style={{ margin: "0 0 0.15rem", fontSize: "0.88rem", fontWeight: 700 }}>{name}</p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>{model}</p>
      </div>
      {dpa && (
        <span style={{ fontSize: "0.73rem", padding: "0.25rem 0.65rem", borderRadius: "999px", background: "rgb(74 222 128 / 0.1)", color: "#4ade80", border: "1px solid rgb(74 222 128 / 0.3)", fontWeight: 600, flexShrink: 0 }}>
          No-training DPA
        </span>
      )}
    </div>
  );
}

export default function CompliancePage() {
  return (
    <main className="page-wrap">
      <Nav />
      <div className="card" style={{ maxWidth: 860, margin: "1.25rem auto 0" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", letterSpacing: "-0.04em" }}>
            Compliance &amp; Data Protection
          </h1>
          <p style={{ margin: "0 0 1rem", color: "var(--muted)", lineHeight: 1.6 }}>
            This page is written for school Data Protection Officers (DPOs), IT leads, and headteachers who need to
            understand how PrimaryAI handles data before approving it for use in their school.
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", borderRadius: "10px",
            background: "rgb(74 222 128 / 0.08)", border: "1px solid rgb(74 222 128 / 0.25)",
            fontSize: "0.82rem", fontWeight: 600, color: "#4ade80",
          }}>
            <CheckIcon />
            Designed to comply with UK GDPR · Data Protection Act 2018 · DfE AI Guidance for Schools
          </div>
        </div>

        <div style={{ display: "grid", gap: "1.5rem" }}>

          <Section title="Who is PrimaryAI for?">
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
              PrimaryAI is a lesson planning and education workflow tool for adult teachers and school staff. It is not a
              pupil-facing application. No child ever logs in to PrimaryAI, and no pupil data is required to use the service.
              Account creation requires confirmation that the user is a qualified teacher or school staff member aged 18 or over.
            </p>
          </Section>

          <Section title="What data is sent to AI providers?">
            <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
              When a teacher generates a lesson pack, the following information is sent to an AI model:
            </p>
            <CheckList items={[
              "Year group and subject (e.g. Year 4, Maths)",
              "Lesson topic (e.g. column addition)",
              "Anonymised class-level statistics (e.g. 20% EAL, 30% Pupil Premium, ability band percentages)",
              "Teaching approach preference (e.g. Concrete-Pictorial-Abstract)",
              "School type (e.g. primary, SEND)",
              "Anonymised free-text class context (e.g. 'follows White Rose Maths, TA supports lower group')",
            ]} />
            <div style={{
              marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "10px",
              background: "rgb(239 68 68 / 0.06)", border: "1px solid rgb(239 68 68 / 0.2)",
            }}>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#ef4444" }}>
                What is never sent to AI providers:
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.55 }}>
                Pupil names · dates of birth · assessment records · SEND diagnoses · any information capable of identifying
                an individual child. Account details (email, name) are never shared with AI providers.
              </p>
            </div>
          </Section>

          <Section title="AI providers and no-training guarantees">
            <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
              PrimaryAI uses a multi-provider AI engine with automatic fallback. Every request to every provider includes a
              mandatory system-level instruction prohibiting model training on the content. Providers are selected on the basis
              that their API terms prohibit training on user inputs without explicit opt-in consent.
            </p>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <Provider name="Groq" model="Llama 3.3 70B" dpa />
              <Provider name="Google Gemini" model="Gemini 2.0 Flash" dpa />
              <Provider name="Cerebras" model="Llama 3.3 70B" dpa />
              <Provider name="Mistral AI" model="Mistral Small" dpa />
              <Provider name="OpenRouter" model="Llama 3.3 70B (routing)" dpa />
              <Provider name="Cohere" model="Command R Plus" dpa />
            </div>
            <div style={{
              marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "10px",
              background: "rgb(74 222 128 / 0.06)", border: "1px solid rgb(74 222 128 / 0.2)",
              fontSize: "0.82rem", lineHeight: 1.55,
            }}>
              <strong>System prompt excerpt (sent with every AI request):</strong>
              <pre style={{
                margin: "0.5rem 0 0", padding: "0.75rem", borderRadius: "8px",
                background: "var(--field-bg)", border: "1px solid var(--border)",
                fontSize: "0.78rem", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap",
              }}>
{`MANDATORY PRIVACY REQUIREMENTS:
1. Do NOT use any content for model training, fine-tuning, or reinforcement learning
2. Treat anonymised classroom context as strictly confidential (UK GDPR)
3. Do NOT store, log, cache, or retain any information beyond immediate response
4. Do NOT reproduce or reference pupil data in a way that could lead to identification
5. Generate response and discard all context immediately after`}
              </pre>
            </div>
          </Section>

          <Section title="UK GDPR compliance">
            <CheckList items={[
              "Legal basis for processing: contract (to deliver the service), legitimate interests (platform security and improvement), and consent (optional features such as calendar sync and surveys)",
              "Data minimisation: only the information needed to generate lesson content is collected and processed",
              "Purpose limitation: data is not used for any purpose beyond delivering the features you use",
              "Storage limitation: accounts inactive for 24+ months are notified and deleted after 30 days",
              "Data subject rights: teachers can export all their data (JSON) and delete their account at any time from the Account page",
              "Security: all data in transit is encrypted (TLS 1.2+). OAuth calendar tokens are encrypted at rest using AES-256-GCM before storage",
              "No third-party analytics or tracking: no Google Analytics, session recording, or advertising pixels are used",
              "Right to lodge a complaint: users are directed to the ICO (ico.org.uk) if they have concerns",
            ]} />
          </Section>

          <Section title="DfE AI guidance for schools">
            <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
              PrimaryAI is designed with the DfE&apos;s guidance on generative AI and data protection in schools in mind:
            </p>
            <CheckList items={[
              "Transparency: this page, our Privacy Policy, and in-product notices clearly explain how AI is used",
              "Human oversight: all AI-generated content is clearly labelled. Teachers review and edit all outputs before use",
              "Pupil data safeguards: the product is designed so pupil PII is never required. Class context fields include real-time warnings against entering identifiable information",
              "Age restrictions: PrimaryAI is for adults only. Signup requires confirmation of teacher/staff status and age 18+",
              "No pupil-facing features: children cannot create accounts or interact with the service in any way",
              "Bias awareness: lesson content should always be reviewed by the teacher before use with a class",
            ]} />
          </Section>

          <Section title="Calendar integrations">
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
              If a teacher connects Google Calendar or Microsoft Outlook, PrimaryAI accesses only the calendar data
              needed to display and sync lesson schedule events. OAuth access tokens and refresh tokens are encrypted
              at rest using AES-256-GCM. Calendar connections can be disconnected at any time from Settings, which
              immediately removes all stored tokens. The scope of calendar access is limited to what the teacher
              explicitly authorises during the OAuth flow.
            </p>
          </Section>

          <Section title="Data storage and infrastructure">
            <CheckList items={[
              "Database: Supabase (PostgreSQL), hosted in the EU. Row-level security policies ensure each user can only access their own data",
              "Application: deployed on Google Cloud Run, region: europe-west1 (Belgium)",
              "Authentication: Supabase Auth with email/password and optional Google OAuth. Session cookies are httpOnly, sameSite=lax, and secure in production",
              "Payments: Stripe. PrimaryAI does not store payment card details",
              "No data leaves the UK/EU jurisdiction without contractual safeguards in place",
            ]} />
          </Section>

          <Section title="For DPOs: frequently asked questions">
            <div style={{ display: "grid", gap: "1rem" }}>
              {[
                {
                  q: "Is a Data Processing Agreement (DPA) available?",
                  a: "Yes. Contact us via the Contact page to request a DPA for your school or trust.",
                },
                {
                  q: "Has a Data Protection Impact Assessment (DPIA) been completed?",
                  a: "A DPIA has been completed covering the AI processing and data flows described above. A summary is available on request.",
                },
                {
                  q: "Is PrimaryAI registered with the ICO?",
                  a: "Contact us via the Contact page for our ICO registration details.",
                },
                {
                  q: "What happens to data if PrimaryAI ceases to operate?",
                  a: "Teachers can export all their data at any time. In the event of service closure, users will be given at least 30 days' notice and an opportunity to export their data before deletion.",
                },
                {
                  q: "Can we restrict which teachers use PrimaryAI?",
                  a: "Access is by individual account. Schools can ask staff to use a school email domain and can request deletion of accounts for leavers via the Contact page.",
                },
              ].map(({ q, a }, i) => (
                <div key={i} style={{ padding: "0.85rem 1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--field-bg)" }}>
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.88rem", fontWeight: 700 }}>{q}</p>
                  <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.55 }}>{a}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Contact">
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>
              For data protection enquiries, DPA requests, DPIA summaries, or to exercise data subject rights, please
              contact us via the{" "}
              <Link href="/contact" style={{ color: "var(--accent)" }}>Contact page</Link>.
              You can also raise a concern directly with the{" "}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                Information Commissioner&apos;s Office (ico.org.uk)
              </a>.
            </p>
          </Section>

        </div>
      </div>
    </main>
  );
}
