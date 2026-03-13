"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { DashboardClock } from "@/components/dashboard/DashboardClock";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/ai-planner",
    label: "AI Planner",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  {
    href: "/billing",
    label: "Billing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
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
      <div className="app-sidebar-clock" aria-hidden="true">
        <DashboardClock />
      </div>

      <div className="app-sidebar-divider" style={{ margin: "0.35rem 0" }} />

      {primaryNavItems.map(({ href, label, icon }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`app-sidebar-link${active ? " active" : ""}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {href === "/account" ? (
              avatarUrl ? (
                <img src={avatarUrl} alt="" className="app-sidebar-nav-avatar" />
              ) : (
                <div className="app-sidebar-avatar app-sidebar-avatar-initials app-sidebar-nav-avatar-fallback" aria-hidden="true">
                  {initials || (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
              )
            ) : (
              icon
            )}
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
          aria-label={accountItem.label}
          aria-current={path === accountItem.href || path.startsWith(`${accountItem.href}/`) ? "page" : undefined}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="app-sidebar-nav-avatar" />
          ) : (
            <div className="app-sidebar-avatar app-sidebar-avatar-initials app-sidebar-nav-avatar-fallback" aria-hidden="true">
              {initials || (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
          )}
          <span className="app-sidebar-tooltip">{accountItem.label}</span>
        </Link>
      ) : null}

      <form action="/api/auth/logout" method="post" onSubmit={handleLogout} style={{ display: "contents" }}>
        <button
          type="submit"
          className="app-sidebar-link"
          aria-label="Sign out"
          title="Sign out"
          disabled={signingOut}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
