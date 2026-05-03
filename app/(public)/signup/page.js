export const runtime = 'edge';
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function SignupPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const next = resolvedSearchParams?.next ? String(resolvedSearchParams.next) : "/dashboard";

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

        <p className="auth-brand-footer">© {new Date().getFullYear()} PrimaryAI. All rights reserved.</p>
      </aside>

      {/* ── Right: Clerk sign-up panel ── */}
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

          <SignUp forceRedirectUrl={next} signInUrl="/login" />
        </div>
      </section>
    </main>
  );
}
