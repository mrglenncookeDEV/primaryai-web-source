import Nav from "@/components/marketing/Nav";

export default function PrivacyPage() {
  return (
    <main className="page-wrap">
      <Nav />
      <div className="card" style={{ maxWidth: 860, margin: "1.25rem auto 0" }}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", letterSpacing: "-0.04em" }}>Privacy Policy</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Last updated: 21 April 2026
        </p>

        <div style={{ display: "grid", gap: "1rem", lineHeight: 1.65 }}>
          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>1. Who we are</h2>
            <p style={{ margin: 0 }}>
              PrimaryAI provides lesson planning, scheduling, survey and related education workflow tools for users working in and around primary education.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>2. What information we collect</h2>
            <p style={{ margin: "0 0 0.4rem" }}>
              Depending on how you use the service, we may collect:
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              <li>account information such as your name, email address and profile image</li>
              <li>teacher and class settings you choose to save</li>
              <li>term dates, timetable items, tasks and custom events you enter</li>
              <li>lesson pack inputs, generated content and saved library items</li>
              <li>survey responses and contact form submissions</li>
              <li>calendar connection data where you choose to connect Google or Outlook</li>
              <li>technical information needed to operate and secure the service, such as session and log data</li>
            </ul>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>3. How we use your information</h2>
            <p style={{ margin: "0 0 0.4rem" }}>
              We use personal data to:
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              <li>create and manage your account</li>
              <li>generate lesson materials and personalise outputs to your settings</li>
              <li>provide timetable, task and calendar-sync features</li>
              <li>respond to enquiries and support requests</li>
              <li>review survey responses and improve the product</li>
              <li>monitor reliability, security and misuse of the service</li>
            </ul>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>4. AI engine and third-party AI providers</h2>
            <p style={{ margin: "0 0 0.75rem" }}>
              PrimaryAI uses a multi-provider AI engine to generate lesson content. When you request a lesson pack, your inputs — including year group, subject, topic, and anonymised class profile settings — are sent to one or more of the following AI providers:
            </p>
            <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.2rem" }}>
              <li><strong>Groq</strong> (groq.com) — Llama 3.3 70B</li>
              <li><strong>Google Gemini</strong> (ai.google.dev) — Gemini 2.0 Flash</li>
              <li><strong>Cerebras</strong> (cerebras.ai) — Llama 3.3 70B</li>
              <li><strong>Mistral AI</strong> (mistral.ai) — Mistral Small</li>
              <li><strong>OpenRouter</strong> (openrouter.ai) — Llama 3.3 70B (free tier routing)</li>
              <li><strong>Cohere</strong> (cohere.com) — Command R Plus</li>
            </ul>
            <p style={{ margin: "0 0 0.75rem" }}>
              <strong>No AI provider trains on your data.</strong> Every request sent to every provider includes a mandatory system-level instruction that explicitly prohibits the use of your content for model training, fine-tuning, reinforcement learning, or any form of model improvement. Providers are contractually selected on the basis that their API terms prohibit training on user inputs without explicit opt-in consent.
            </p>
            <p style={{ margin: "0 0 0.75rem" }}>
              <strong>No pupil personal data is sent to AI providers.</strong> Class context passed to the AI engine is limited to anonymised, statistical settings you configure (such as ability level percentages, SEND focus, and EAL proportions). No pupil names, dates of birth, assessment records, or any other data capable of identifying individual children are included in AI requests.
            </p>
            <p style={{ margin: "0 0 0.75rem" }}>
              <strong>Requests are not retained by providers.</strong> Each AI provider receives the minimum information needed to generate the immediate response. Providers are instructed to discard all context after responding. We do not share your account details, contact information, or any other personal data with AI providers.
            </p>
            <p style={{ margin: 0 }}>
              These measures are applied in line with UK GDPR (UK Data Protection Act 2018) and the Children Act 2004. If you have concerns about AI data handling, please contact us using the details on the Contact page.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>5. Calendar integrations</h2>
            <p style={{ margin: 0 }}>
              If you connect Google Calendar or Microsoft Outlook, PrimaryAI may access calendar information you authorise in order to import events, show availability, and write back scheduler events where you enable that functionality. We only use that access to provide the calendar features you request.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>6. Legal basis</h2>
            <p style={{ margin: 0 }}>
              Where UK GDPR applies, we generally process personal data because it is necessary to provide the service you request, to pursue legitimate interests in improving and securing the platform, or because you have chosen to submit information such as survey responses or calendar connections.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>7. Sharing</h2>
            <p style={{ margin: 0 }}>
              We do not sell your personal data. We may share data with service providers who help us operate the platform, such as hosting, authentication, database, analytics, payment, email, AI and calendar integration providers, where needed to deliver the service. AI providers receive only the minimum anonymised content necessary to generate lesson outputs, as described in section 4.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>8. Retention</h2>
            <p style={{ margin: "0 0 0.5rem" }}>
              We retain personal data for as long as your account is active. If your account has been inactive (no login) for
              more than <strong>24 months</strong>, we will notify you by email and, unless you reactivate your account
              within 30 days, delete your account data in accordance with this policy.
            </p>
            <p style={{ margin: 0 }}>
              You may delete your account at any time via Settings → Account. On deletion, all personal data associated
              with your account is permanently removed from our systems within 30 days, except where we are required by law
              to retain certain records. Anonymised, aggregated usage statistics that cannot identify you may be retained
              indefinitely.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>9. Your rights</h2>
            <p style={{ margin: "0 0 0.5rem" }}>
              Under UK GDPR you have the right to:
            </p>
            <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.2rem" }}>
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Rectification</strong> — ask us to correct inaccurate or incomplete data</li>
              <li><strong>Erasure</strong> — request deletion of your personal data ("right to be forgotten")</li>
              <li><strong>Restriction</strong> — ask us to limit how we process your data</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
            </ul>
            <p style={{ margin: "0 0 0.5rem" }}>
              You can export a copy of all your personal data directly from the Service at any time via{" "}
              <strong>Settings → Account → Download my data</strong>. To exercise any other right, contact us using the
              details on the Contact page. We will respond within one calendar month.
            </p>
            <p style={{ margin: 0 }}>
              You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at{" "}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>ico.org.uk</a>{" "}
              if you believe we have not handled your data appropriately.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>10. Security</h2>
            <p style={{ margin: 0 }}>
              We take reasonable technical and organisational steps to protect personal data, including encrypted transmission of all AI requests, access controls on stored data, and provider selection based on data-handling standards. No internet-based service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>11. Children</h2>
            <p style={{ margin: 0 }}>
              PrimaryAI is intended for adult users such as teachers, school staff and education professionals. The AI engine is designed to operate without receiving any personal data relating to individual pupils. Users should not upload unnecessary pupil personal data into the platform. Any anonymised class context entered into lesson planning settings should not include information that could identify individual children.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>12. Changes</h2>
            <p style={{ margin: 0 }}>
              We may update this policy from time to time. Material changes will be reflected on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>13. Contact</h2>
            <p style={{ margin: 0 }}>
              For privacy questions or requests, please use the contact details provided on the Contact page.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
