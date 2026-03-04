import Link from "next/link";

function getMessage(searchParams) {
  if (searchParams?.error) {
    return { text: decodeURIComponent(String(searchParams.error)), isError: true };
  }
  if (searchParams?.sent) {
    return {
      text: "If an account exists and is awaiting verification, a fresh email has been sent.",
      isError: false,
    };
  }
  return null;
}

export default async function ResendVerificationPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const message = getMessage(resolvedSearchParams || {});

  return (
    <main className="auth-layout">
      <section className="auth-panel" style={{ gridColumn: "1 / -1", minHeight: "100dvh" }}>
        <div className="auth-form-wrap">
          <h1 className="auth-heading">Resend verification email</h1>
          <p className="auth-subheading">Enter your email and we will send a new verification link.</p>

          {message ? (
            <div className={`auth-message${message.isError ? " is-error" : ""}`} role={message.isError ? "alert" : "status"}>
              <span className="auth-message-text">{message.text}</span>
            </div>
          ) : null}

          <form action="/api/auth/resend-verification" method="post">
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                className="auth-input"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button className="auth-submit" type="submit">Resend email</button>
          </form>

          <p className="auth-switch">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
