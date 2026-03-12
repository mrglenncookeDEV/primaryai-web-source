"use client";

import { useEffect, useRef, useState } from "react";

export default function SignupForm({ next }) {
  const [submitting, setSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);

  // Clean up timer if the component unmounts (page navigated away successfully)
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleSubmit() {
    setSubmitting(true);
    setTimedOut(false);
    // If the server hasn't responded in 15s, re-enable the form with a message
    timerRef.current = setTimeout(() => {
      setSubmitting(false);
      setTimedOut(true);
    }, 15000);
  }

  return (
    <form action="/api/auth/signup" method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="next" value={next} />

      <div className="auth-field">
        <label className="auth-label" htmlFor="email">Email</label>
        <input
          className="auth-input"
          id="email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="password">Password</label>
        <input
          className="auth-input"
          id="password"
          type="password"
          name="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {timedOut && (
        <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "#fc8181" }}>
          This is taking longer than expected. Please check your connection and try again.
        </p>
      )}

      <button
        className="auth-submit"
        type="submit"
        disabled={submitting}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          opacity: submitting ? 0.75 : 1,
          cursor: submitting ? "not-allowed" : "pointer",
          transition: "opacity 150ms ease",
        }}
      >
        {submitting && (
          <span
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.65s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
