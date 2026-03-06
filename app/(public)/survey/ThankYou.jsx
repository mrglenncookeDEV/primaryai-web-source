"use client";

import { useState } from "react";

export default function ThankYou({ surveyId }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitPilotInterest(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    const response = await fetch("/api/survey/pilot-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyResponseId: surveyId, email }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setStatus(payload?.error || "Could not save your pilot interest right now.");
      return;
    }

    setStatus("Thank you - we will be in touch.");
    setEmail("");
  }

  return (
    <section className="surveyx-card card">
      <p className="surveyx-part-kicker">Complete</p>
      <h1 className="surveyx-part-title" style={{ marginBottom: "0.4rem" }}>Thank you.</h1>
      <p className="surveyx-thanks-body" style={{ marginBottom: "1.5rem" }}>
        Your input will directly shape how PrimaryAI is built. We&apos;re aiming to launch Spring 2026 — if you&apos;d like early access as a pilot tester, leave your email below.
      </p>

      <form className="surveyx-pilot-form" onSubmit={submitPilotInterest}>
        <label className="surveyx-field">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.org"
            required
          />
        </label>
        <button type="submit" className="button surveyx-next-btn" disabled={saving}>
          {saving ? "Saving..." : "Join the pilot"}
        </button>
      </form>

      {status ? <p className="surveyx-status-message">{status}</p> : null}
    </section>
  );
}
