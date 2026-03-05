"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/contact", label: "Contact Us" },
];

export default function NavLinks({ session }) {
  const pathname = usePathname();
  const [resolvedSession, setResolvedSession] = useState(session ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session !== undefined) {
      setResolvedSession(session ?? null);
      return;
    }

    function readSessionFromCookies() {
      if (typeof document === "undefined") return null;
      const entries = document.cookie.split(";").map((v) => v.trim()).filter(Boolean);

      // Legacy app cookie first
      const legacy = entries.find((entry) => entry.startsWith("pa_session="));
      if (legacy) {
        try {
          const raw = decodeURIComponent(legacy.slice("pa_session=".length));
          const parsed = JSON.parse(raw);
          if (parsed?.userId || parsed?.email) {
            return {
              userId: String(parsed.userId || ""),
              email: String(parsed.email || ""),
            };
          }
        } catch {
          // Ignore malformed cookie and continue fallback parsing.
        }
      }

      // Supabase auth cookie fallback
      const supabaseTokenCookie = entries.find((entry) => entry.includes("-auth-token="));
      if (!supabaseTokenCookie) return null;

      try {
        const raw = decodeURIComponent(supabaseTokenCookie.slice(supabaseTokenCookie.indexOf("=") + 1));
        const parsed = JSON.parse(raw);
        const accessToken = Array.isArray(parsed)
          ? parsed[0]
          : typeof parsed?.access_token === "string"
            ? parsed.access_token
            : "";
        if (!accessToken) return null;
        const payloadPart = String(accessToken).split(".")[1];
        if (!payloadPart) return null;
        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64));
        return {
          userId: typeof payload?.sub === "string" ? payload.sub : "",
          email: typeof payload?.email === "string" ? payload.email : "",
        };
      } catch {
        return null;
      }
    }

    setResolvedSession(readSessionFromCookies());
  }, [session, pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const appLinks = resolvedSession
    ? [
        { href: "/settings", label: "Settings" },
      ]
    : [];

  const allLinks = [
    ...(resolvedSession ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...appLinks,
    ...navLinks,
  ];

  const email = resolvedSession?.email ?? "";
  const inferredName = email.includes("@") ? email.split("@")[0] : "";
  const statusText = resolvedSession ? inferredName || "Signed in" : "Offline";

  return (
    <>
      {/* Desktop: centred links */}
      <div className="nav-links">
        {allLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${link.phone ? " nav-link-stack" : ""}`}
          >
            <span>{link.label}</span>
            {link.phone ? <span className="nav-link-sub">{link.phone}</span> : null}
          </Link>
        ))}
      </div>

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
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="nav-btn-ghost">
              Sign out
            </button>
          </form>
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
                href={link.href}
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
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="mobile-nav-btn-ghost">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
