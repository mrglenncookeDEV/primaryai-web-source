"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/lesson-pack",
    label: "New Lesson",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/ai-planner",
    label: "AI Planner",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    icon: null, // replaced with avatar below
  },
];

export default function MobileBottomNav() {
  const path = usePathname();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initials, setInitials] = useState("");

  useEffect(() => {
    fetch("/api/profile/setup")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.profileSetup) return;
        const url = String(data.profileSetup.avatarUrl || "");
        const name = String(data.profileSetup.displayName || "");
        setAvatarUrl(url);
        if (!url && name) {
          const parts = name.trim().split(/\s+/);
          setInitials(
            parts.length >= 2
              ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
              : name.slice(0, 2).toUpperCase()
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`mobile-bottom-nav-item${active ? " active" : ""}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {href === "/account" ? (
              avatarUrl ? (
                <img src={avatarUrl} alt="" className="mobile-bottom-nav-avatar" />
              ) : (
                <div className="mobile-bottom-nav-avatar-fallback" aria-hidden="true">
                  {initials || (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
              )
            ) : (
              icon
            )}
            <span className="mobile-bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
