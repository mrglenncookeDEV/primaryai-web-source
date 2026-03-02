"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export default function NavLinks({ session }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const allLinks = [
    ...navLinks,
    ...(session ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ];

  return (
    <>
      {/* Desktop: centred links */}
      <div className="nav-links">
        {allLinks.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
      </div>

      {/* Desktop: auth cluster */}
      <div className="nav-auth">
        <div className="nav-status">
          <span className={`nav-status-led ${session ? "is-online" : "is-offline"}`} />
          {session && (
            <span className="nav-status-email" title={session.email}>
              {session.email}
            </span>
          )}
        </div>

        {!session ? (
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
      <ThemeToggle userId={session?.userId ?? null} />

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
                {link.label}
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
            {!session ? (
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
