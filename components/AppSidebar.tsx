"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { DashboardClock } from "@/components/dashboard/DashboardClock";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    bg: "#1C7EE8",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
      </svg>
    ),
  },
  {
    href: "/lesson-pack",
    label: "New Lesson",
    bg: "#FF9F0A",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    href: "/ai-planner",
    label: "AI Planner",
    bg: "#BF5AF2",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2 11 6.5 15.5 8 11 9.5 9.5 14 8 9.5 3.5 8 8 6.5 9.5 2z" />
        <path d="M19.5 11 20.5 13.5 23 14.5 20.5 15.5 19.5 18 18.5 15.5 16 14.5 18.5 13.5 19.5 11z" />
        <path d="M17 19l.7 1.8L19.5 21.5l-1.8.7L17 24l-.7-1.8L14.5 21.5l1.8-.7L17 19z" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    bg: "#30B0C7",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    bg: "#8E8E93",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    bg: "#5E5CE6",
    icon: null,
  },
  {
    href: "/billing",
    label: "Billing",
    bg: "#30D158",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2.5" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

export default function AppSidebar() {
  const path = usePathname() ?? "";
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [initials, setInitials] = useState<string>("");
  const [signingOut, setSigningOut] = useState(false);
  const accountItem = NAV.find((item) => item.href === "/account") ?? null;
  const primaryNavItems = NAV.filter((item) => item.href !== "/account");

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
            setInitials(parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase());
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
        setInitials(parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase());
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

  async function handleLogout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const payload = await response.json().catch(() => ({}));
      window.location.assign(payload?.redirectTo || "/");
    } catch {
      setSigningOut(false);
      window.location.assign("/");
    }
  }

  return (
    <aside className="app-sidebar" aria-label="App navigation">
      <div className="app-sidebar-calendar" aria-hidden="true">
        <DashboardCalendar />
      </div>
      <div className="app-sidebar-clock" aria-hidden="true">
        <DashboardClock />
      </div>

      <div className="app-sidebar-divider" />

      {primaryNavItems.map(({ href, label, icon, bg }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`app-sidebar-link${active ? " active" : ""}`}
            style={{ background: bg, color: "#fff" }}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {icon}
            <span className="app-sidebar-tooltip">{label}</span>
          </Link>
        );
      })}

      <div className="app-sidebar-spacer" />
      <div className="app-sidebar-divider" />

      {accountItem ? (
        <Link
          href={accountItem.href}
          className={`app-sidebar-link${path === accountItem.href || path.startsWith(`${accountItem.href}/`) ? " active" : ""}`}
          style={{ background: avatarUrl ? "transparent" : accountItem.bg, color: "#fff", padding: 0, overflow: "hidden" }}
          aria-label={accountItem.label}
          aria-current={path === accountItem.href || path.startsWith(`${accountItem.href}/`) ? "page" : undefined}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="app-sidebar-nav-avatar" />
          ) : (
            <span className="app-sidebar-nav-initials">
              {initials || (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </span>
          )}
          <span className="app-sidebar-tooltip">{accountItem.label}</span>
        </Link>
      ) : null}

      <form action="/api/auth/logout" method="post" onSubmit={handleLogout} style={{ display: "contents" }}>
        <button
          type="submit"
          className="app-sidebar-link"
          style={{ background: "#FF3B30", color: "#fff" }}
          aria-label="Sign out"
          title="Sign out"
          disabled={signingOut}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="app-sidebar-tooltip">{signingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </form>
    </aside>
  );
}
