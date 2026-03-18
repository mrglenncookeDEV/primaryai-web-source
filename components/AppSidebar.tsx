"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { type FormEvent, type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { VscLibrary } from "react-icons/vsc";
import { RiMoneyPoundCircleLine } from "react-icons/ri";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    bg: "linear-gradient(145deg, #4a9ef5 0%, #1567d3 100%)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
    bg: "linear-gradient(145deg, #ffbc3a 0%, #e88200 100%)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    bg: "linear-gradient(145deg, #4cc8dc 0%, #1897af 100%)",
    icon: <VscLibrary size={20} />,
  },
  {
    href: "/ai-planner",
    label: "AI Planner",
    bg: "linear-gradient(145deg, #cd7cf6 0%, #a338ec 100%)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2 11 6.5 15.5 8 11 9.5 9.5 14 8 9.5 3.5 8 8 6.5 9.5 2z" />
        <path d="M19.5 11 20.5 13.5 23 14.5 20.5 15.5 19.5 18 18.5 15.5 16 14.5 18.5 13.5 19.5 11z" />
        <path d="M17 19l.7 1.8L19.5 21.5l-1.8.7L17 24l-.7-1.8L14.5 21.5l1.8-.7L17 19z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    bg: "linear-gradient(145deg, #a3a3a8 0%, #75757a 100%)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Account",
    bg: "linear-gradient(145deg, #7c7af0 0%, #4a48d8 100%)",
    icon: null,
  },
  {
    href: "/billing",
    label: "Billing",
    bg: "linear-gradient(145deg, #4ee078 0%, #1cb845 100%)",
    icon: <RiMoneyPoundCircleLine size={20} />,
  },
];

export default function AppSidebar() {
  const path = usePathname() ?? "";
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [initials, setInitials] = useState<string>("");
  const [signingOut, setSigningOut] = useState(false);

  // Drag state — null = use CSS default (position: absolute, centred in sidebar)
  // Set to {x, y} when dragged; position: fixed with those coords.
  // State is never persisted so it resets on every page load.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // Ghost dimensions captured at first drag so the outline matches the real dock.
  const [ghostSize, setGhostSize] = useState<{ w: number; h: number } | null>(null);

  const dockRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const isDragging = useRef(false);

  const accountItem = NAV.find((item) => item.href === "/account") ?? null;
  const primaryNavItems = NAV.filter((item) => item.href !== "/account");

  // ── Drag-to-reposition ──────────────────────────────────────────────────────
  const onHandleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dockRef.current) return;

    const rect = dockRef.current.getBoundingClientRect();

    // Snapshot dock dimensions for the ghost outline (only needed once)
    if (!ghostSize) {
      setGhostSize({ w: rect.width, h: rect.height });
    }

    // Offset of mouse within the dock so it doesn't jump on first move
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    isDragging.current = true;
    dockRef.current.dataset.dragging = "1";
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    // Seed position from current viewport coords so the switch to position:fixed
    // is seamless (no jump).
    setPos({ x: rect.left, y: rect.top });

    function onMove(ev: globalThis.MouseEvent) {
      if (!isDragging.current) return;
      const dockW = dockRef.current?.offsetWidth  ?? 58;
      const dockH = dockRef.current?.offsetHeight ?? 400;
      const x = Math.max(0, Math.min(window.innerWidth  - dockW, ev.clientX - dragOffset.current.dx));
      const y = Math.max(0, Math.min(window.innerHeight - dockH, ev.clientY - dragOffset.current.dy));

      // Snap zone — default resting position of the dock
      const snapX = 12;
      const snapY = window.innerHeight / 2 - dockH / 2;
      const dist  = Math.hypot(x - snapX, y - snapY);

      if (dist < 60) {
        // Snap in: return to default and recalculate offset so dragging out feels natural
        dragOffset.current = { dx: ev.clientX - snapX, dy: ev.clientY - snapY };
        setPos(null);
      } else {
        setPos({ x, y });
      }
    }

    function onUp() {
      isDragging.current = false;
      if (dockRef.current) delete dockRef.current.dataset.dragging;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [ghostSize]);

  // ── Profile avatar ──────────────────────────────────────────────────────────
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

  // Dock is always position:fixed.
  // Default (pos===null): 12px from left edge, vertically centred on screen.
  // Dragged (pos set): coords captured from getBoundingClientRect at drag start.
  const dockStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y, transform: "none" }
    : { position: "fixed", left: 12, top: "50%", transform: "translateY(-50%)" };

  return (
    <aside className="app-sidebar" aria-label="App navigation">

      {/* Ghost placeholder — faint dotted outline when dock has been dragged away */}
      {pos && ghostSize && (
        <div
          className="app-sidebar-ghost"
          style={{ width: ghostSize.w, height: ghostSize.h }}
          aria-hidden="true"
        />
      )}

      {/* The dock itself */}
      <div ref={dockRef} className="app-sidebar-dock" style={dockStyle}>

        {/* Grab handle */}
        <div
          className="app-sidebar-dock-handle"
          aria-hidden="true"
          onMouseDown={onHandleMouseDown}
        >
          <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
            <circle cx="3"  cy="3"  r="1.8" />
            <circle cx="9"  cy="3"  r="1.8" />
            <circle cx="3"  cy="10" r="1.8" />
            <circle cx="9"  cy="10" r="1.8" />
            <circle cx="3"  cy="17" r="1.8" />
            <circle cx="9"  cy="17" r="1.8" />
          </svg>
        </div>

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

        <div className="app-sidebar-dock-sep" />

        {accountItem ? (
          <Link
            href={accountItem.href}
            className={`app-sidebar-link app-sidebar-link--no-tile${path === accountItem.href || path.startsWith(`${accountItem.href}/`) ? " active" : ""}`}
            style={{ background: avatarUrl ? "transparent" : accountItem.bg, color: "#fff", padding: 0, overflow: "hidden" }}
            aria-label={accountItem.label}
            aria-current={path === accountItem.href || path.startsWith(`${accountItem.href}/`) ? "page" : undefined}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="app-sidebar-nav-avatar" />
            ) : (
              <span className="app-sidebar-nav-initials">
                {initials || (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
            className="app-sidebar-link app-sidebar-link--no-tile"
            style={{ background: "transparent", color: "#FF3B30" }}
            aria-label="Sign out"
            title="Sign out"
            disabled={signingOut}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="app-sidebar-tooltip">{signingOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </form>

      </div>
    </aside>
  );
}
