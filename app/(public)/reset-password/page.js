"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

function readAccessToken() {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);
  return hashParams.get("access_token") || queryParams.get("access_token") || "";
}

export default function ResetPasswordPage() {
  const accessToken = useMemo(() => readAccessToken(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!accessToken) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not reset password");
      }

      setMessage("Password updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/reset-password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel" style={{ gridColumn: "1 / -1", minHeight: "100dvh" }}>
        <div className="auth-form-wrap">
          <h1 className="auth-heading">Set a new password</h1>
          <p className="auth-subheading">Choose a new password for your account.</p>

          {error ? (
            <div className="auth-message is-error" role="alert">
              <span className="auth-message-text">{error}</span>
            </div>
          ) : null}
          {message ? (
            <div className="auth-message" role="status">
              <span className="auth-message-text">{message}</span>
            </div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">New password</label>
              <input
                className="auth-input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Confirm new password</label>
              <input
                className="auth-input"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>

          <p className="auth-switch">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
