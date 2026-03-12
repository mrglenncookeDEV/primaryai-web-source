"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function LoginForm({ next }) {
  const [submitting, setSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setTimedOut(false);
    setError("");
    timerRef.current = setTimeout(() => {
      setSubmitting(false);
      setTimedOut(true);
    }, 16000);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload?.redirectTo) {
        throw new Error(payload?.error || "Unable to sign in right now. Please try again.");
      }

      clearTimeout(timerRef.current);
      window.location.assign(payload.redirectTo);
    } catch (submitError) {
      clearTimeout(timerRef.current);
      setSubmitting(false);
      setTimedOut(false);
      setError(submitError?.message || "Unable to sign in right now. Please try again.");
    }
  }

  return (
    <form action="/api/auth/login" method="post" onSubmit={handleSubmit}>
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
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <p className="auth-secondary-link" style={{ marginTop: "-0.2rem", marginBottom: "0.85rem" }}>
        <Link href={`/forgot-password?next=${encodeURIComponent(next)}`}>Forgotten password?</Link>
      </p>

      {timedOut ? (
        <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "#fc8181" }}>
          Sign-in is taking too long. No session was created. Please try again.
        </p>
      ) : null}

      {error ? (
        <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "#fc8181" }}>
          {error}
        </p>
      ) : null}

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
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
