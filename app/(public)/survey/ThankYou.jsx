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
      <h1 className="survey-title">Thank you - your response has been saved.</h1>
      <p className="survey-description muted">Your input will directly shape how PrimaryAI is built.</p>
      <p className="surveyx-thanks-body">
        We&apos;re aiming to launch Spring 2026. If you&apos;d like to be a pilot tester, leave your email
        below and we&apos;ll be in touch.
      </p>

      <form className="surveyx-pilot-form" onSubmit={submitPilotInterest}>
        <label className="surveyx-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@school.org"
            required
          />
        </label>
        <button type="submit" className="button surveyx-next-btn" disabled={saving}>
          {saving ? "Saving..." : "Join Pilot Interest"}
        </button>
      </form>

      {status ? <p className="surveyx-status-message">{status}</p> : null}
    </section>
  );
}
