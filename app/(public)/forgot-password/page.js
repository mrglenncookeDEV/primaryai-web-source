import Link from "next/link";

function getMessage(searchParams) {
  if (searchParams?.error) {
    return { text: decodeURIComponent(String(searchParams.error)), isError: true };
  }
  if (searchParams?.sent) {
    return {
      text: "If an account exists for that email address, a reset link has been sent.",
      isError: false,
    };
  }
  return null;
}

export default async function ForgotPasswordPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const next = resolvedSearchParams?.next ? String(resolvedSearchParams.next) : "/dashboard";
  const message = getMessage(resolvedSearchParams || {});

  return (
    <main className="auth-layout">
      <section className="auth-panel" style={{ gridColumn: "1 / -1", minHeight: "100dvh" }}>
        <div className="auth-form-wrap">
          <h1 className="auth-heading">Reset your password</h1>
          <p className="auth-subheading">Enter your email and we will send you a secure reset link.</p>

          {message && (
            <div className={`auth-message${message.isError ? " is-error" : ""}`} role={message.isError ? "alert" : "status"}>
              <span className="auth-message-text">{message.text}</span>
            </div>
          )}

          <form action="/api/auth/forgot-password" method="post">
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
            <button className="auth-submit" type="submit">Send reset link</button>
          </form>

          <p className="auth-switch">
            Remembered it? <Link href={`/login?next=${encodeURIComponent(next)}`}>Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
