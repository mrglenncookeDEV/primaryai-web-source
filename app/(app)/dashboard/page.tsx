"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";

type LibraryItem = {
  id: string;
  title: string;
  yearGroup: string;
  subject: string;
  topic: string;
  createdAt: string;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SUBJECT_COLOURS: Record<string, string> = {
  Maths: "var(--accent)",
  English: "#60a5fa",
  Science: "#4ade80",
  History: "#f59e0b",
  Geography: "#34d399",
  Computing: "#a78bfa",
  Music: "#f472b6",
  Art: "#fb923c",
  PE: "#22d3ee",
  PSHE: "#e879f9",
  RE: "#facc15",
};
function subjectColor(s: string) {
  for (const [k, v] of Object.entries(SUBJECT_COLOURS)) {
    if (s.startsWith(k)) return v;
  }
  return "var(--muted)";
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: number; icon: ReactNode; color: string; loading: boolean;
}) {
  return (
    <div style={{
      borderRadius: "16px",
      border: "1px solid var(--border-card)",
      background: "var(--surface)",
      padding: "1.1rem 1.2rem",
      position: "relative" as const,
      overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute" as const,
        top: 0, left: 0, right: 0,
        height: "2px",
        background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div>
          <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted)" }}>{label}</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1 }}>
            {loading ? (
              <span style={{ display: "inline-block", width: "2rem", height: "1.8rem", borderRadius: "6px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ) : value}
          </p>
        </div>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────────

function ActionCard({ href, icon, title, desc, accent = false }: {
  href: string; icon: ReactNode; title: string; desc: string; accent?: boolean;
}) {
  return (
    <Link href={href} style={{
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "1rem 1.1rem",
      borderRadius: "14px",
      border: `1.5px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      background: accent ? "rgb(var(--accent-rgb) / 0.07)" : "var(--surface)",
      textDecoration: "none",
      transition: "border-color 160ms ease, background 160ms ease, transform 120ms ease",
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}
    >
      <div style={{
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: accent ? "rgb(var(--accent-rgb) / 0.15)" : "var(--field-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: accent ? "var(--accent)" : "var(--muted)",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 0.1rem", fontSize: "0.88rem", fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)" }}>{title}</p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>{desc}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--muted)", opacity: 0.5 }}>
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("Starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [libRes, sessRes] = await Promise.all([
        fetch("/api/library"),
        fetch("/api/auth/session"),
      ]);

      if (libRes.ok) {
        const lib = await libRes.json();
        setItems(lib.items ?? []);
      }
      if (sessRes.ok) {
        const sess = await sessRes.json();
        setEmail(sess?.user?.email ?? sess?.email ?? "");
        setPlan(sess?.plan ?? "Starter");
      }
      setLoading(false);
    })();
  }, []);

  // Derived stats
  const total = items.length;
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const thisWeek = items.filter((i) => new Date(i.createdAt) > weekAgo).length;
  const subjects = new Set(items.map((i) => i.subject)).size;
  const yearGroups = new Set(items.map((i) => i.yearGroup)).size;
  const recent = items.slice(0, 5);

  const firstName = email.split("@")[0] ?? "";

  return (
    <main className="page-wrap" style={{ maxWidth: 960 }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        <div>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--accent)" }}>
            {greeting()}
          </p>
          <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.035em", color: "var(--text)", lineHeight: 1.1 }}>
            {firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "Your workspace"}
          </h1>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
            {email || "Primary AI dashboard"}
          </p>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.5rem 1rem",
          borderRadius: "999px",
          border: "1px solid var(--border-card)",
          background: "var(--surface)",
          fontSize: "0.78rem",
          color: "var(--muted)",
        }}>
          <span style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
            display: "inline-block",
          }} />
          {plan} plan active
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Packs" value={total} loading={loading} color="var(--accent)" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        } />
        <StatCard label="This Week" value={thisWeek} loading={loading} color="var(--orange)" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        } />
        <StatCard label="Subjects" value={subjects} loading={loading} color="#60a5fa" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
          </svg>
        } />
        <StatCard label="Year Groups" value={yearGroups} loading={loading} color="#a78bfa" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        } />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.35fr)", gap: "1rem", alignItems: "start" }}>

        {/* Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
            Quick actions
          </p>

          <ActionCard
            href="/lesson-pack"
            accent
            title="Generate Lesson Pack"
            desc="AI-powered resources for any topic in seconds"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            }
          />

          <ActionCard
            href="/library"
            title="Lesson Library"
            desc="Browse and manage your saved packs"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            }
          />

          <ActionCard
            href="/settings"
            title="Teacher Settings"
            desc="Defaults, tone, school type and preferences"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            }
          />

          <ActionCard
            href="/account"
            title="Account & Billing"
            desc="Manage your subscription and plan"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
          />
        </div>

        {/* Recent library */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
              Recent lesson packs
            </p>
            <Link href="/library" style={{ fontSize: "0.76rem", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                height: "72px",
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1px solid var(--border-card)",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}

            {!loading && recent.length === 0 && (
              <div style={{
                padding: "2.5rem 1.5rem",
                borderRadius: "16px",
                border: "1.5px dashed var(--border)",
                textAlign: "center" as const,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", margin: "0 auto 0.75rem", display: "block" }}>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.85rem", color: "var(--muted)" }}>No saved lesson packs yet.</p>
                <Link href="/lesson-pack" className="nav-btn-cta" style={{ fontSize: "0.82rem", padding: "0.5rem 1.1rem", borderRadius: "10px", textDecoration: "none" }}>
                  Generate your first pack
                </Link>
              </div>
            )}

            {!loading && recent.map((item) => {
              const color = subjectColor(item.subject);
              return (
                <Link key={item.id} href="/library" style={{ textDecoration: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    padding: "0.85rem 1rem",
                    borderRadius: "14px",
                    border: "1px solid var(--border-card)",
                    background: "var(--surface)",
                    transition: "border-color 150ms ease, transform 120ms ease",
                  }}>
                    {/* Color dot */}
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: `color-mix(in srgb, ${color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color,
                    }}>
                      {item.subject.slice(0, 3).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: "0 0 0.2rem",
                        fontSize: "0.87rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>{item.topic}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "0.08rem 0.45rem",
                          borderRadius: "999px",
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                          color,
                        }}>{item.yearGroup}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{item.subject}</span>
                      </div>
                    </div>

                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0, textAlign: "right" as const }}>
                      {relativeTime(item.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>{/* /grid */}

    </main>
  );
}
