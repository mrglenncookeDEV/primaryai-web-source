import Link from "next/link";

function getMessage(searchParams) {
  if (searchParams?.error) return { text: decodeURIComponent(searchParams.error), isError: true };
  return null;
}

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SignupPage({ searchParams }) {
  const message = getMessage(searchParams || {});

  return (
    <main className="auth-layout">
      {/* ── Left: always-dark brand panel ── */}
      <aside className="auth-brand">
        <Link href="/" className="auth-brand-logo">
          <svg
            className="auth-brand-logo-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            shapeRendering="geometricPrecision"
            aria-hidden="true"
          >
            <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5" stroke="#ff9f43" strokeWidth="1.7" />
            <path d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12" stroke="currentColor" strokeWidth="1.7" />
            <path d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12,12.2 v8.1" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12" stroke="currentColor" strokeWidth="1.7" />
          </svg>
          <span className="auth-brand-logo-text">
            Pr<span className="auth-brand-logo-orange">i</span>m<span className="auth-brand-logo-orange">a</span>ry<span className="auth-brand-logo-orange">A</span><span className="auth-brand-logo-orange">I</span>
          </span>
        </Link>

        <div className="auth-brand-body">
          <h2 className="auth-brand-headline">
            Start teaching smarter with <strong>AI by your side</strong>
          </h2>

          <ul className="auth-brand-features">
            {[
              "Free to get started, no card needed",
              "Plans ready in seconds, not hours",
              "Built for primary school educators",
            ].map((f) => (
              <li key={f} className="auth-brand-feature">
                <span className="auth-brand-feature-dot">
                  <CheckIcon />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-brand-footer">© {new Date().getFullYear()} Primary AI. All rights reserved.</p>
      </aside>

      {/* ── Right: form panel ── */}
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Link href="/" className="auth-mobile-logo">
            <svg
              className="auth-mobile-logo-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              shapeRendering="geometricPrecision"
              aria-hidden="true"
            >
              <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5" stroke="var(--orange)" strokeWidth="1.7" />
              <path d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12" stroke="currentColor" strokeWidth="1.7" />
              <path d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12,12.2 v8.1" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <span className="auth-mobile-logo-text">
              Pr<span className="auth-mobile-logo-orange">i</span>m<span className="auth-mobile-logo-orange">a</span>ry<span className="auth-mobile-logo-orange">A</span><span className="auth-mobile-logo-orange">I</span>
            </span>
          </Link>

          <h1 className="auth-heading">Create your account</h1>
          <p className="auth-subheading">Join thousands of educators using Primary AI</p>

          {message && (
            <div
              className={`auth-message${message.isError ? " is-error" : ""}`}
              role={message.isError ? "alert" : "status"}
            >
              <span className="auth-message-icon" aria-hidden="true">
                {message.isError ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8l2.5 2.5L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="auth-message-text">{message.text}</span>
            </div>
          )}

          <a className="auth-google" href="/api/auth/google">
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="auth-or">or</div>

          <form action="/api/auth/signup" method="post">
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

            <button className="auth-submit" type="submit">
              Create account
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
