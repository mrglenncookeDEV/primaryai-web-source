"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  updated_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotesWidget() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setNotes((data.notes as Note[]).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const preview = (content: string) => {
    const trimmed = content.replace(/\s+/g, " ").trim();
    return trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed;
  };

  return (
    <div className="notes-widget-card">
      <div className="notes-widget-header">
        <p className="notes-widget-eyebrow">Notes</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/notes?new=1" className="notes-widget-new-btn" aria-label="New note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
          <Link href="/notes" className="notes-widget-view-all">View all →</Link>
        </div>
      </div>

      {loading && (
        <div className="notes-widget-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="notes-widget-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      {!loading && notes.length === 0 && (
        <div className="notes-widget-empty">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)", margin: "0 auto 0.5rem", display: "block" }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <p>No notes yet</p>
          <Link href="/notes?new=1" className="notes-widget-cta">Create your first note</Link>
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="notes-widget-list">
          {notes.map((note) => (
            <Link key={note.id} href={`/notes?id=${note.id}`} className="notes-widget-item">
              <div className="notes-widget-item-top">
                {note.pinned && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }}>
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                )}
                <span className="notes-widget-item-title">
                  {note.title || "Untitled note"}
                </span>
                <span className="notes-widget-item-date">{formatDate(note.updated_at)}</span>
              </div>
              {note.content && (
                <p className="notes-widget-item-preview">{preview(note.content)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
