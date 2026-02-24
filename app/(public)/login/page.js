import Link from "next/link";
import Nav from "@/components/marketing/Nav";

function getMessage(searchParams) {
  if (searchParams?.error) return decodeURIComponent(searchParams.error);
  if (searchParams?.registered) return "Account created. You can sign in now.";
  if (searchParams?.verified) return "Email verified. You can sign in now.";
  return "";
}

export default function LoginPage({ searchParams }) {
  const message = getMessage(searchParams || {});
  const next = searchParams?.next ? String(searchParams.next) : "/dashboard";

  return (
    <main className="page-wrap">
      <Nav />
      <h1>Login</h1>
      {message ? <p className="muted">{message}</p> : null}
      <section className="card">
        <form className="stack" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" required />
          </div>
          <button className="button" type="submit">
            Sign In
          </button>
        </form>
      </section>
      <p className="muted">
        No account yet? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
