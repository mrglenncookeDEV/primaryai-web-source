import Nav from "@/components/marketing/Nav";

export default function PrivacyPage() {
  return (
    <main className="page-wrap">
      <Nav />
      <div className="card" style={{ maxWidth: 860, margin: "1.25rem auto 0" }}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", letterSpacing: "-0.04em" }}>Privacy Policy</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Last updated: 7 March 2026
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
            <h2 style={{ marginBottom: "0.35rem" }}>4. Calendar integrations</h2>
            <p style={{ margin: 0 }}>
              If you connect Google Calendar or Microsoft Outlook, PrimaryAI may access calendar information you authorise in order to import events, show availability, and write back scheduler events where you enable that functionality. We only use that access to provide the calendar features you request.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>5. Legal basis</h2>
            <p style={{ margin: 0 }}>
              Where UK GDPR applies, we generally process personal data because it is necessary to provide the service you request, to pursue legitimate interests in improving and securing the platform, or because you have chosen to submit information such as survey responses or calendar connections.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>6. Sharing</h2>
            <p style={{ margin: 0 }}>
              We do not sell your personal data. We may share data with service providers who help us operate the platform, such as hosting, authentication, database, analytics, payment, email, AI and calendar integration providers, where needed to deliver the service.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>7. Retention</h2>
            <p style={{ margin: 0 }}>
              We keep personal data for as long as reasonably necessary to provide the service, maintain records, resolve disputes, comply with legal obligations, and improve the platform. If you ask us to delete your data, we will process that request subject to legal and operational requirements.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>8. Your rights</h2>
            <p style={{ margin: 0 }}>
              You may have rights to access, correct, delete, restrict or object to certain processing of your personal data, and to request a copy of the data you have provided. To exercise those rights, contact us using the details on the Contact page.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>9. Security</h2>
            <p style={{ margin: 0 }}>
              We take reasonable technical and organisational steps to protect personal data, but no internet-based service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>10. Children</h2>
            <p style={{ margin: 0 }}>
              PrimaryAI is intended for adult users such as teachers, school staff and education professionals. Users should not upload unnecessary pupil personal data into the platform.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>11. Changes</h2>
            <p style={{ margin: 0 }}>
              We may update this policy from time to time. Material changes will be reflected on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: "0.35rem" }}>12. Contact</h2>
            <p style={{ margin: 0 }}>
              For privacy questions or requests, please use the contact details provided on the Contact page.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
