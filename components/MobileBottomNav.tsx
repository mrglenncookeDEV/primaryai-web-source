"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { VscLibrary } from "react-icons/vsc";
import { FaPenClip } from "react-icons/fa6";

const NAV_LEFT = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    icon: <VscLibrary size={22} />,
  },
  {
    href: "/notes",
    label: "Notes",
    icon: <FaPenClip size={20} />,
  },
];

const NAV_RIGHT = [
  {
    href: "/ai-planner",
    label: "AI Planner",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2 11 6.5 15.5 8 11 9.5 9.5 14 8 9.5 3.5 8 8 6.5 9.5 2z" />
        <path d="M19.5 11 20.5 13.5 23 14.5 20.5 15.5 19.5 18 18.5 15.5 16 14.5 18.5 13.5 19.5 11z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    icon: null,
  },
];

export default function MobileBottomNav() {
  const path = usePathname() ?? "";
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initials, setInitials] = useState("");

  useEffect(() => {
    const loadProfileSetup = () => {
      fetch("/api/profile/setup", { cache: "no-store" })
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
          } else if (!name) {
            setInitials("");
          }
        })
        .catch(() => {});
    };

    const handleProfileSetupUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ displayName?: string; avatarUrl?: string }>;
      const url = String(customEvent.detail?.avatarUrl || "");
      const name = String(customEvent.detail?.displayName || "");
      setAvatarUrl(url);
      if (!url && name) {
        const parts = name.trim().split(/\s+/);
        setInitials(
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase()
        );
      } else if (!name) {
        setInitials("");
      }
    };

    loadProfileSetup();
    window.addEventListener("pa:profile-setup-updated", handleProfileSetupUpdated as EventListener);
    return () => {
      window.removeEventListener("pa:profile-setup-updated", handleProfileSetupUpdated as EventListener);
    };
  }, []);

  const fabActive = path === "/lesson-pack" || path.startsWith("/lesson-pack/");

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">

      {/* Left items */}
      {NAV_LEFT.map(({ href, label, icon }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`mobile-bottom-nav-item${active ? " active" : ""}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-bottom-nav-icon">{icon}</span>
            <span className="mobile-bottom-nav-label">{label}</span>
          </Link>
        );
      })}

      {/* Elevated centre FAB — New Lesson */}
      <Link
        href="/lesson-pack"
        className={`mobile-bottom-nav-fab${fabActive ? " active" : ""}`}
        aria-label="New Lesson"
        aria-current={fabActive ? "page" : undefined}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span className="mobile-bottom-nav-fab-label">New</span>
      </Link>

      {/* Right items */}
      {NAV_RIGHT.map(({ href, label, icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
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
              <span className="mobile-bottom-nav-icon">{icon}</span>
            )}
            <span className="mobile-bottom-nav-label">{label}</span>
          </Link>
        );
      })}

    </nav>
  );
}
