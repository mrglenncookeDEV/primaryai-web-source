import Link from "next/link";
import Nav from "@/components/marketing/Nav";

function getMessage(searchParams) {
  if (searchParams?.error) return decodeURIComponent(searchParams.error);
  return "";
}

export default function SignupPage({ searchParams }) {
  const message = getMessage(searchParams || {});

  return (
    <main className="page-wrap">
      <Nav />
      <h1>Create Account</h1>
      {message ? <p className="muted">{message}</p> : null}
      <section className="card">
        <form className="stack" action="/api/auth/signup" method="post">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" minLength={8} required />
          </div>
          <button className="button" type="submit">
            Create Account
          </button>
        </form>
      </section>
      <p className="muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
