"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";

const PERSISTENT_LINKS = [
  { href: "/", label: "Home" },
  { href: "/guide", label: "Guide" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
  { href: "/contact", label: "Contact Us" },
];
const SESSION_USER_KEY = "pa_active_user_key";

function getLinkHref(href, resolvedSession) {
  if (href === "/" || href === "/guide" || href === "/contact") return href;
  if (resolvedSession) return href;
  return `/login?next=${encodeURIComponent(href)}`;
}

function clearUserScopedBrowserState() {
  try {
    sessionStorage.removeItem("pa_dashboard_summary_v2");
    sessionStorage.clear();
  } catch {
    // Ignore browser storage failures.
  }
}

export default function NavLinks({ session = null }) {
  const [resolvedSession, setResolvedSession] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Server may pass null for static pages — sync with Clerk client auth after hydration
    if (isSignedIn && userId) {
      const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";
      setResolvedSession({ userId, email, role: "authenticated" });
    } else if (isSignedIn === false) {
      setResolvedSession(null);
    }
  }, [isSignedIn, userId, user]);


  useEffect(() => {
    const currentUserKey = resolvedSession?.userId || resolvedSession?.email || "";
    try {
      const previousUserKey = sessionStorage.getItem(SESSION_USER_KEY) || "";
      if (previousUserKey && previousUserKey !== currentUserKey) {
        clearUserScopedBrowserState();
      }
      if (currentUserKey) {
        sessionStorage.setItem(SESSION_USER_KEY, currentUserKey);
      } else {
        sessionStorage.removeItem(SESSION_USER_KEY);
      }
    } catch {
      // Ignore browser storage failures.
    }
  }, [resolvedSession]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  async function handleLogout() {
    setSigningOut(true);
    clearUserScopedBrowserState();
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      setSigningOut(false);
    }
  }

  const allLinks = PERSISTENT_LINKS.map((link) => ({
    ...link,
    resolvedHref: getLinkHref(link.href, resolvedSession),
  }));

  const email = resolvedSession?.email ?? "";
  const statusText = resolvedSession ? email || "Signed in" : "Offline";

  return (
    <>
      {/* Desktop: centred links */}
      <div className="nav-links">
        {allLinks.map((link) => (
          <Link
            key={link.href}
            href={link.resolvedHref}
            className={`nav-link${link.phone ? " nav-link-stack" : ""}`}
          >
            <span>{link.label}</span>
            {link.phone ? <span className="nav-link-sub">{link.phone}</span> : null}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        {/* Desktop: auth cluster */}
        <div className="nav-auth">
          <div className="nav-status">
            <span className={`nav-status-led ${resolvedSession ? "is-online" : "is-offline"}`} />
            <span className="nav-status-email" title={email || statusText}>
              {statusText}
            </span>
          </div>

          {!resolvedSession ? (
            <>
              <Link href="/login" className="nav-btn-ghost">
                Login
              </Link>
              <Link href="/signup" className="nav-btn-cta">
                Get started
              </Link>
            </>
          ) : (
            <button type="button" className="nav-btn-ghost" disabled={signingOut} onClick={handleLogout}>
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          )}
        </div>

        {/* Theme toggle — always visible */}
        <ThemeToggle userId={resolvedSession?.userId ?? null} />

        {/* Mobile: hamburger */}
        <button
          className={`nav-hamburger${isOpen ? " open" : ""}`}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          <div className="nav-hamburger-bars">
            <span />
            <span />
            <span />
          </div>
        </button>
      </div>

      {/* Mobile: full-screen panel — portalled to body to escape nav's backdrop-filter stacking context */}
      {mounted && createPortal(
        <div
          className={`mobile-nav-panel${isOpen ? " open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <nav className="mobile-nav-links">
            {allLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.resolvedHref}
                className="mobile-nav-link"
                style={{ "--i": i }}
                onClick={close}
              >
                <span>{link.label}</span>
                {link.phone ? <span className="mobile-nav-link-sub">{link.phone}</span> : null}
                <svg
                  className="mobile-nav-link-arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            ))}
          </nav>

          <div className="mobile-nav-footer">
            {resolvedSession ? (
              <div className="mobile-nav-session">
                <span className="mobile-nav-session-label">Signed in as</span>
                <span className="mobile-nav-session-email">{email}</span>
              </div>
            ) : null}
            {!resolvedSession ? (
              <>
                <Link href="/login" className="mobile-nav-btn-ghost" onClick={close}>
                  Login
                </Link>
                <Link href="/signup" className="mobile-nav-btn-cta" onClick={close}>
                  Get started
                </Link>
              </>
            ) : (
              <button type="button" className="mobile-nav-btn-ghost" disabled={signingOut} onClick={handleLogout}>
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
