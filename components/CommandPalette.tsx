"use client";

import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Pack = {
  id: string;
  title: string;
  subject: string;
  yearGroup: string;
  topic: string;
};

type Result = {
  href: string;
  label: string;
  sub?: string;
  category: string;
  type: "page" | "pack";
};

const PAGES: Result[] = [
  { href: "/dashboard", label: "Dashboard", sub: "Your overview", category: "Navigate", type: "page" },
  { href: "/lesson-pack", label: "Generate Lesson Pack", sub: "AI-powered lesson resources", category: "Navigate", type: "page" },
  { href: "/critical-planner", label: "Critical Planner", sub: "School structure, AfL and next-step gated planning", category: "Navigate", type: "page" },
  { href: "/library", label: "Lesson Library", sub: "Browse your saved packs", category: "Navigate", type: "page" },
  { href: "/wellbeing-report", label: "Wellbeing Report", sub: "Workload and check-in trends", category: "Navigate", type: "page" },
  { href: "/settings", label: "Teacher Settings", sub: "Preferences and defaults", category: "Navigate", type: "page" },
  { href: "/account", label: "Account", sub: "Profile and sign-in", category: "Navigate", type: "page" },
  { href: "/billing", label: "Billing", sub: "Manage your subscription", category: "Navigate", type: "page" },
];

const PAGE_ICONS: Record<string, ReactElement> = {
  "/dashboard": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  "/lesson-pack": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  ),
  "/critical-planner": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  "/library": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  "/wellbeing-report": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17s3-6 6-3 4 4 7-2 5-5 5-5" /><path d="M3 21h18" />
    </svg>
  ),
  "/settings": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  ),
  "/account": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  "/billing": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selected, setSelected] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pa:open-command-palette", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pa:open-command-palette", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 20);
    fetch("/api/library?view=summary&limit=200")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.items)) {
          setPacks(
            data.items.map((item: Record<string, string>) => ({
              id: item.id,
              title: item.title,
              subject: item.subject,
              yearGroup: item.year_group || item.yearGroup,
              topic: item.topic,
            }))
          );
        }
      })
      .catch(() => {});
  }, [open]);

  const q = query.toLowerCase().trim();

  const filteredPages = q
    ? PAGES.filter((p) => p.label.toLowerCase().includes(q) || (p.sub ?? "").toLowerCase().includes(q))
    : PAGES;

  const filteredPacks: Result[] = q
    ? packs
        .filter(
          (p) =>
            p.title?.toLowerCase().includes(q) ||
            p.subject?.toLowerCase().includes(q) ||
            p.topic?.toLowerCase().includes(q)
        )
        .slice(0, 6)
        .map((p) => ({
          href: `/lesson-pack?id=${encodeURIComponent(p.id)}`,
          label: p.title || p.topic,
          sub: `${p.subject} · ${p.yearGroup}`,
          category: "Lesson Packs",
          type: "pack" as const,
        }))
    : packs.slice(0, 4).map((p) => ({
        href: `/lesson-pack?id=${encodeURIComponent(p.id)}`,
        label: p.title || p.topic,
        sub: `${p.subject} · ${p.yearGroup}`,
        category: "Lesson Packs",
        type: "pack" as const,
      }));

  const allResults = [
    ...filteredPages,
    ...(packs.length > 0 ? filteredPacks : []),
  ];

  useEffect(() => { setSelected(0); }, [query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((v) => Math.min(v + 1, allResults.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((v) => Math.max(v - 1, 0));
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
    if (e.key === "Enter" && allResults[selected]) {
      navigate(allResults[selected].href);
    }
  }

  if (!mounted) return null;
  if (!open) return null;

  // Group results by category
  const grouped: { category: string; items: (Result & { idx: number })[] }[] = [];
  let idx = 0;
  const categories = Array.from(new Set(allResults.map((r) => r.category)));
  for (const cat of categories) {
    const items = allResults
      .map((r, i) => ({ ...r, idx: i }))
      .filter((r) => r.category === cat);
    if (items.length > 0) grouped.push({ category: cat, items });
    idx += items.length;
  }
  void idx;

  return createPortal(
    <div
      className="cmdpal-overlay"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="cmdpal-box" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="cmdpal-input-row">
          <span className="cmdpal-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className="cmdpal-input"
            type="text"
            placeholder="Search pages, lesson packs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="cmdpal-close-btn" onClick={() => setOpen(false)} aria-label="Close search">
            Close
          </button>
        </div>

        {/* Results */}
        <div className="cmdpal-results" role="listbox">
          {allResults.length === 0 ? (
            <div className="cmdpal-empty">No results for &quot;{query}&quot;</div>
          ) : (
            grouped.map(({ category, items }) => (
              <div key={category}>
                <div className="cmdpal-category-label">{category}</div>
                {items.map((result) => (
                  <button
                    key={result.href}
                    className={`cmdpal-result${result.idx === selected ? " is-selected" : ""}`}
                    onClick={() => navigate(result.href)}
                    onMouseEnter={() => setSelected(result.idx)}
                    role="option"
                    aria-selected={result.idx === selected}
                  >
                    <span className={`cmdpal-result-icon${result.type === "pack" ? " is-pack" : ""}`} aria-hidden="true">
                      {result.type === "page" && PAGE_ICONS[result.href]}
                      {result.type === "pack" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      )}
                    </span>
                    <span className="cmdpal-result-text">
                      <span className="cmdpal-result-label">{result.label}</span>
                      {result.sub && <span className="cmdpal-result-sub">{result.sub}</span>}
                    </span>
                    {result.idx === selected && (
                      <kbd className="cmdpal-result-kbd">↵</kbd>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="cmdpal-footer" aria-hidden="true">
          <span className="cmdpal-footer-item">
            <kbd className="cmdpal-kbd">↑↓</kbd> navigate
          </span>
          <span className="cmdpal-footer-item">
            <kbd className="cmdpal-kbd">↵</kbd> open
          </span>
          <span className="cmdpal-footer-item">
            <kbd className="cmdpal-kbd">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
