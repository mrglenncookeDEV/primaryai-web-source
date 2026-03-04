"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { subjectColor } from "@/lib/subjectColor";

type LibraryItem = {
  id: string;
  title: string;
  yearGroup: string;
  subject: string;
  topic: string;
  json?: string;
  createdAt: string;
};

type LessonPack = {
  year_group: string;
  subject: string;
  topic: string;
  learning_objectives: string[];
  teacher_explanation: string;
  pupil_explanation: string;
  worked_example: string;
  common_misconceptions: string[];
  activities: { support: string; expected: string; greater_depth: string };
  send_adaptations: string[];
  plenary: string;
  mini_assessment: { questions: string[]; answers: string[] };
  slides: { title: string; bullets: string[]; speaker_notes?: string }[];
};

function parsePack(raw: string): LessonPack | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as LessonPack;
    return null;
  } catch {
    return null;
  }
}

function mapLibraryItem(raw: any): LibraryItem {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    yearGroup: String(raw?.yearGroup ?? raw?.year_group ?? ""),
    subject: String(raw?.subject ?? ""),
    topic: String(raw?.topic ?? ""),
    json: typeof raw?.json === "string" ? raw.json : undefined,
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
  };
}

// ── Shared export trigger ──────────────────────────────────────────────────────

async function triggerExport(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc", pack: LessonPack, slug: string) {
  const res = await fetch("/api/lesson-pack/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, pack }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const header = res.headers.get("content-disposition") || "";
  const filenameMatch = /filename=\"?([^\";]+)\"?/i.exec(header);
  const ext = format === "lesson-pdf" ? ".pdf" : format === "slides-pptx" ? ".pptx" : ".doc";
  const filename = filenameMatch?.[1] || `${slug}${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="libraryx-preview-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <p style={{ color: "var(--muted)", margin: 0 }}>None provided.</p>;
  return (
    <ul className="libraryx-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function ActivityCard({ label, content }: { label: string; content: string }) {
  return (
    <div style={{
      border: "1px solid #dbe3ee",
      borderRadius: "10px",
      padding: "0.6rem 0.75rem",
      background: "rgb(255 255 255 / 0.75)",
    }}>
      <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "#1e293b" }}>{content || "Not provided."}</p>
    </div>
  );
}

function ExportBar({ pack, slug }: { pack: LessonPack; slug: string }) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function doExport(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc") {
    setExporting(format);
    try {
      await triggerExport(format, pack, slug);
    } finally {
      setExporting(null);
    }
  }

  const btnStyle: React.CSSProperties = {
    padding: "0.4rem 0.85rem",
    borderRadius: "8px",
    border: "1px solid var(--border-card)",
    background: "var(--surface)",
    color: "var(--muted)",
    fontSize: "0.78rem",
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "color 150ms ease, border-color 150ms ease",
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid #e2e8f0" }}>
      <button style={btnStyle} onClick={() => doExport("lesson-pdf")} disabled={exporting === "lesson-pdf"}>
        {exporting === "lesson-pdf" ? "Downloading…" : "🖨 Export PDF"}
      </button>
      <button style={btnStyle} onClick={() => doExport("slides-pptx")} disabled={exporting === "slides-pptx"}>
        {exporting === "slides-pptx" ? "Downloading…" : "📊 Export PPTX"}
      </button>
      <button style={btnStyle} onClick={() => doExport("worksheet-doc")} disabled={exporting === "worksheet-doc"}>
        {exporting === "worksheet-doc" ? "Downloading…" : "📄 Export Worksheet"}
      </button>
    </div>
  );
}

function PreviewDocument({ item }: { item: LibraryItem }) {
  const pack = useMemo(() => parsePack(item.json || ""), [item.json]);
  const slug = `${item.subject}-${item.topic}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const color = subjectColor(item.subject);

  if (!pack) {
    return (
      <div className="libraryx-fallback">
        <p style={{ color: "var(--muted)" }}>Could not parse this lesson pack. Showing raw JSON:</p>
        <pre>{item.json}</pre>
      </div>
    );
  }

  return (
    <article className="libraryx-preview-paper" aria-label="Lesson pack preview">

      {/* Header */}
      <header className="libraryx-preview-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <span style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 700,
              marginBottom: "0.35rem",
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              color,
              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            }}>
              {pack.year_group || item.yearGroup} · {pack.subject || item.subject}
            </span>
            <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.15rem" }}>{pack.topic || item.topic}</h2>
            <p className="libraryx-preview-meta">Saved {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <ExportBar pack={pack} slug={slug} />
      </header>

      {/* Learning Objectives */}
      <Section title="Learning Objectives">
        <BulletList items={pack.learning_objectives} />
      </Section>

      {/* Teacher Explanation */}
      <Section title="Teacher Explanation">
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b" }}>{pack.teacher_explanation || "Not provided."}</p>
      </Section>

      {/* Pupil Explanation */}
      <Section title="Pupil Explanation">
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b" }}>{pack.pupil_explanation || "Not provided."}</p>
      </Section>

      {/* Worked Example */}
      <Section title="Worked Example">
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b", whiteSpace: "pre-wrap" }}>{pack.worked_example || "Not provided."}</p>
      </Section>

      {/* Common Misconceptions */}
      <Section title="Common Misconceptions">
        <BulletList items={pack.common_misconceptions} />
      </Section>

      {/* Differentiated Activities */}
      <Section title="Differentiated Activities">
        <div className="libraryx-sequence-grid">
          <ActivityCard label="Support" content={pack.activities?.support} />
          <ActivityCard label="Expected" content={pack.activities?.expected} />
          <ActivityCard label="Greater Depth" content={pack.activities?.greater_depth} />
        </div>
      </Section>

      {/* SEND Adaptations */}
      <Section title="SEND Adaptations">
        <BulletList items={pack.send_adaptations} />
      </Section>

      {/* Review and Reflect */}
      <Section title="Review and Reflect">
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b" }}>{pack.plenary || "Not provided."}</p>
      </Section>

      {/* Mini Assessment */}
      <Section title="Mini Assessment">
        {(pack.mini_assessment?.questions?.length ?? 0) > 0 ? (
          <ol className="libraryx-assessment-list">
            {pack.mini_assessment.questions.map((q, i) => (
              <li key={i}>
                <p style={{ margin: "0 0 0.15rem" }}>{q}</p>
                <p className="libraryx-answer">Answer: {pack.mini_assessment.answers?.[i] || "Not provided."}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ color: "var(--muted)", margin: 0 }}>No assessment items provided.</p>
        )}
      </Section>

    </article>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, LibraryItem>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function loadLibrary() {
    const res = await fetch("/api/library?view=summary&limit=200");
    const data = await res.json();
    if (!res.ok) { setStatus(data?.error ?? "Could not load library"); return; }
    setItems(Array.isArray(data.items) ? data.items.map(mapLibraryItem) : []);
    setStatus("");
  }

  async function loadDetail(id: string) {
    if (detailCache[id]) {
      setSelected(detailCache[id]);
      return;
    }
    setDetailLoading(true);
    const res = await fetch(`/api/library/${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.error ?? "Could not load lesson pack preview");
      setDetailLoading(false);
      return;
    }
    const next = mapLibraryItem(data.item);
    setDetailCache((prev) => ({ ...prev, [id]: next }));
    setSelected(next);
    setDetailLoading(false);
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (!res.ok) { const data = await res.json(); setStatus(data?.error ?? "Delete failed"); return; }
    await loadLibrary();
    if (selectedId === id) {
      setSelectedId(null);
      setSelected(null);
    }
    setDetailCache((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  useEffect(() => { void loadLibrary(); }, []);

  return (
    <main className="page-wrap libraryx-wrap">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em" }}>Lesson Library</h1>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>All your saved lesson packs in one place.</p>
      </div>
      {status && <p style={{ color: "#f87171", marginBottom: "1rem" }}>{status}</p>}

      <div className="libraryx-grid">

        {/* ── List panel ── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.length === 0 && (
            <div style={{
              borderRadius: "16px",
              border: "1.5px dashed var(--border)",
              padding: "2rem 1.5rem",
              textAlign: "center",
            }}>
              <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.88rem" }}>No saved packs yet.</p>
              <Link href="/lesson-pack" style={{
                display: "inline-block",
                padding: "0.5rem 1.1rem",
                borderRadius: "10px",
                background: "var(--accent)",
                color: "var(--accent-text)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}>Generate your first pack</Link>
            </div>
          )}

          {items.map((item) => {
            const color = subjectColor(item.subject);
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  void loadDetail(item.id);
                }}
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "14px",
                  border: `1.5px solid ${isSelected ? color : "var(--border-card)"}`,
                  background: isSelected ? `color-mix(in srgb, ${color} 6%, var(--surface))` : "var(--surface)",
                  cursor: "pointer",
                  borderLeft: `4px solid ${color}`,
                  transition: "border-color 150ms ease, background 150ms ease",
                }}
              >
                <p style={{ margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>{item.title}</p>
                <p style={{ margin: "0 0 0.55rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                  {item.yearGroup} · {item.subject} · {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Link
                    href={`/lesson-pack?id=${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "7px",
                      border: "1px solid var(--border)",
                      background: "none",
                      color: "var(--muted)",
                      fontSize: "0.78rem",
                      textDecoration: "none",
                      transition: "color 150ms ease",
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: "32px",
                    }}
                  >
                    Open in generator ↗
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); void deleteItem(item.id); }}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "7px",
                      border: "1px solid var(--border)",
                      background: "none",
                      color: "var(--muted)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      minHeight: "32px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Preview panel ── */}
        <section>
          {detailLoading ? (
            <div style={{
              borderRadius: "16px",
              border: "1.5px dashed var(--border)",
              padding: "3rem 2rem",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "0.88rem",
            }}>
              Loading preview…
            </div>
          ) : selected ? (
            <PreviewDocument item={selected} />
          ) : (
            <div style={{
              borderRadius: "16px",
              border: "1.5px dashed var(--border)",
              padding: "3rem 2rem",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "0.88rem",
            }}>
              Select a pack to preview it here.
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
