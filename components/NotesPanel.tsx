"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  updated_at: string;
};

type Props = {
  lessonPackId?: string | null;
  scheduleEventId?: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotesPanel({ lessonPackId, scheduleEventId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!lessonPackId && !scheduleEventId) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (lessonPackId) params.set("lesson_pack_id", lessonPackId);
    if (scheduleEventId) params.set("schedule_event_id", scheduleEventId);
    fetch(`/api/notes?${params}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setNotes(data.notes); })
      .finally(() => setLoading(false));
  }, [lessonPackId, scheduleEventId]);

  async function createNote() {
    setCreating(true);
    try {
      const body: Record<string, string> = {};
      if (lessonPackId) body.lesson_pack_id = lessonPackId;
      if (scheduleEventId) body.schedule_event_id = scheduleEventId;
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "", ...body }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotes((prev) => [data.note, ...prev]);
        setExpandedId(data.note.id);
        setEditContent((prev) => ({ ...prev, [data.note.id]: "" }));
      }
    } finally {
      setCreating(false);
    }
  }

  function handleContentChange(noteId: string, value: string) {
    setEditContent((prev) => ({ ...prev, [noteId]: value }));
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(async () => {
      await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content: value, updated_at: new Date().toISOString() } : n));
    }, 1200);
  }

  if (!lessonPackId && !scheduleEventId) return null;

  return (
    <div className="notes-panel">
      <div className="notes-panel-header">
        <span className="notes-panel-label">Notes</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {notes.length > 0 && (
            <Link href="/notes" className="notes-panel-view-all">View all →</Link>
          )}
          <button
            className="notes-panel-add-btn"
            onClick={() => void createNote()}
            disabled={creating}
            title="Add note"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {loading && (
        <div className="notes-panel-loading">
          <div className="notes-panel-skeleton" />
          <div className="notes-panel-skeleton" style={{ animationDelay: "0.1s", width: "75%" }} />
        </div>
      )}

      {!loading && notes.length === 0 && (
        <p className="notes-panel-empty">No notes yet. Add one to keep track of thoughts about this {lessonPackId ? "lesson pack" : "event"}.</p>
      )}

      {!loading && notes.map((note) => {
        const isOpen = expandedId === note.id;
        const content = editContent[note.id] ?? note.content;
        return (
          <div key={note.id} className={`notes-panel-item${isOpen ? " is-open" : ""}`}>
            <button
              className="notes-panel-item-header"
              onClick={() => {
                setExpandedId(isOpen ? null : note.id);
                if (!isOpen && !(note.id in editContent)) {
                  setEditContent((prev) => ({ ...prev, [note.id]: note.content }));
                }
              }}
            >
              <span className="notes-panel-item-title">{note.title || "Untitled note"}</span>
              <span className="notes-panel-item-meta">
                {formatDate(note.updated_at)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="notes-panel-item-body">
                <textarea
                  className="notes-panel-textarea"
                  placeholder="Write your note here…"
                  value={content}
                  onChange={(e) => handleContentChange(note.id, e.target.value)}
                  rows={4}
                />
                <Link
                  href={`/notes?id=${note.id}`}
                  className="notes-panel-open-link"
                >
                  Open full note →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
