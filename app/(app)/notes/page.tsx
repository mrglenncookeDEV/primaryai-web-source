"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Attachment = {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string | null;
  created_at: string;
};

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  lesson_pack_id: string | null;
  schedule_event_id: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string | null) {
  return !!mime?.startsWith("image/");
}

export default function NotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const urlHandled = useRef(false);

  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPinned, setEditPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveQueued, setSaveQueued] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleting, setDeleting] = useState(false);

  // ── Load notes ──────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.ok) setNotes(data.notes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotes(); }, [loadNotes]);

  // Handle ?id= and ?new=1 URL params on first load
  useEffect(() => {
    if (loading || urlHandled.current) return;
    urlHandled.current = true;
    const idParam = searchParams?.get("id");
    const newParam = searchParams?.get("new");
    if (idParam) {
      const found = notes.find((n) => n.id === idParam);
      if (found) selectNote(found);
      router.replace("/notes", { scroll: false });
    } else if (newParam === "1") {
      void createNote();
      router.replace("/notes", { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, notes]);

  // ── Load attachments for active note ────────────────────────────────────────
  const loadAttachments = useCallback(async (noteId: string) => {
    setAttachLoading(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/attachments`);
      const data = await res.json();
      if (data.ok) setAttachments(data.attachments);
    } finally {
      setAttachLoading(false);
    }
  }, []);

  // ── Select a note ───────────────────────────────────────────────────────────
  function selectNote(note: Note) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setActiveId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditPinned(note.pinned);
    setAttachments([]);
    void loadAttachments(note.id);
  }

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const doSave = useCallback(async (id: string, title: string, content: string, pinned: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, pinned }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...data.note } : n));
      }
    } finally {
      setSaving(false);
      setSaveQueued(false);
    }
  }, []);

  function scheduleAutoSave(id: string, title: string, content: string, pinned: boolean) {
    setSaveQueued(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(id, title, content, pinned), 1200);
  }

  function handleTitleChange(v: string) {
    setEditTitle(v);
    if (activeId) scheduleAutoSave(activeId, v, editContent, editPinned);
  }

  function handleContentChange(v: string) {
    setEditContent(v);
    if (activeId) scheduleAutoSave(activeId, editTitle, v, editPinned);
  }

  function handlePinnedToggle() {
    const next = !editPinned;
    setEditPinned(next);
    if (activeId) void doSave(activeId, editTitle, editContent, next);
  }

  // ── Create note ─────────────────────────────────────────────────────────────
  async function createNote() {
    setCreating(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "" }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotes((prev) => [data.note, ...prev]);
        selectNote(data.note);
      }
    } finally {
      setCreating(false);
    }
  }

  // ── Delete note ─────────────────────────────────────────────────────────────
  async function deleteNote() {
    if (!activeId) return;
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/notes/${activeId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== activeId));
      setActiveId(null);
      setEditTitle("");
      setEditContent("");
      setAttachments([]);
    } finally {
      setDeleting(false);
    }
  }

  // ── Inline image paste ───────────────────────────────────────────────────────
  async function handleContentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem || !activeId) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    // Capture cursor position and content BEFORE the async upload
    const ta = contentRef.current;
    const cursorStart = ta?.selectionStart ?? editContent.length;
    const cursorEnd = ta?.selectionEnd ?? editContent.length;
    const contentSnapshot = editContent;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/notes/${activeId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        const att = data.attachment as Attachment;
        setAttachments((prev) => [...prev, att]);
        const token = `![${att.name}](${att.id})`;
        const next = contentSnapshot.slice(0, cursorStart) + token + contentSnapshot.slice(cursorEnd);
        handleContentChange(next);
        if (ta) {
          setTimeout(() => {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = cursorStart + token.length;
          }, 0);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  // ── Content renderer (for preview mode) ─────────────────────────────────────
  function renderContentWithImages(content: string) {
    const lines = content.split("\n");
    return lines.map((line, lineIdx) => {
      const parts: React.ReactNode[] = [];
      const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let last = 0;
      let match;
      while ((match = imgRe.exec(line)) !== null) {
        if (match.index > last) parts.push(line.slice(last, match.index));
        const attachId = match[2];
        const altText = match[1];
        parts.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${lineIdx}-${match.index}`}
            src={`/api/notes/${activeId}/attachments/${attachId}`}
            alt={altText}
            style={{ maxWidth: "100%", maxHeight: "360px", borderRadius: "6px", display: "block", margin: "0.4rem 0" }}
          />
        );
        last = match.index + match[0].length;
      }
      if (last < line.length) parts.push(line.slice(last));
      return (
        <span key={lineIdx}>
          {parts}
          {lineIdx < lines.length - 1 && <br />}
        </span>
      );
    });
  }

  // ── Upload attachment ────────────────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!activeId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/notes/${activeId}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) setAttachments((prev) => [...prev, data.attachment]);
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  // ── Delete attachment ────────────────────────────────────────────────────────
  async function deleteAttachment(attachId: string) {
    if (!activeId) return;
    await fetch(`/api/notes/${activeId}/attachments/${attachId}`, { method: "DELETE" });
    setAttachments((prev) => prev.filter((a) => a.id !== attachId));
  }

  // ── Filtered notes ───────────────────────────────────────────────────────────
  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  return (
    <div className="notes-shell">
      {/* ── List panel ── */}
      <aside className="notes-list-panel">
        <div className="notes-list-header">
          <h1 className="notes-list-title">Notes</h1>
          <button className="notes-new-btn" onClick={() => void createNote()} disabled={creating}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New note
          </button>
        </div>
        <div className="notes-search-wrap">
          <svg className="notes-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="notes-search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="notes-list">
          {loading && <p className="notes-empty">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="notes-empty">{search ? "No matching notes." : "No notes yet. Create your first one."}</p>
          )}
          {filtered.map((note) => (
            <button
              key={note.id}
              className={`notes-list-item${note.id === activeId ? " active" : ""}`}
              onClick={() => selectNote(note)}
            >
              <div className="notes-list-item-top">
                {note.pinned && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="notes-pin-icon">
                    <path d="M16 1l-1 1-1.5 5.5L8 9 7 10l4 4-3 7 1 1 4-5.5 4.5 4.5 1-1L15 16l2-5.5L22 9l1-1-7-7z"/>
                  </svg>
                )}
                <span className="notes-list-item-title">{note.title || "Untitled note"}</span>
              </div>
              <p className="notes-list-item-preview">{note.content.slice(0, 80) || "No content"}</p>
              <span className="notes-list-item-date">{formatDate(note.updated_at)}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Editor panel ── */}
      <main className="notes-editor-panel">
        {!activeNote ? (
          <div className="notes-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <p>Select a note or create a new one</p>
            <button className="notes-new-btn" onClick={() => void createNote()} disabled={creating}>
              New note
            </button>
          </div>
        ) : (
          <>
            <div className="notes-editor-toolbar">
              <div className="notes-editor-toolbar-left">
                <button
                  className={`notes-pin-btn${editPinned ? " active" : ""}`}
                  onClick={handlePinnedToggle}
                  title={editPinned ? "Unpin note" : "Pin note"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={editPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 1l-1 1-1.5 5.5L8 9 7 10l4 4-3 7 1 1 4-5.5 4.5 4.5 1-1L15 16l2-5.5L22 9l1-1-7-7z"/>
                  </svg>
                  {editPinned ? "Pinned" : "Pin"}
                </button>
                <span className="notes-save-status">
                  {saving ? "Saving…" : saveQueued ? "Unsaved" : "Saved"}
                </span>
              </div>
              <div className="notes-editor-toolbar-right">
                <span className="notes-meta-date">Last edited {formatDate(activeNote.updated_at)}</span>
                <button
                  className={`notes-pin-btn${previewMode ? " active" : ""}`}
                  onClick={() => setPreviewMode((p) => !p)}
                  title={previewMode ? "Switch to edit" : "Switch to preview"}
                >
                  {previewMode ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                  {previewMode ? "Edit" : "Preview"}
                </button>
                <button className="notes-delete-btn" onClick={() => void deleteNote()} disabled={deleting}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>

            <input
              className="notes-title-input"
              placeholder="Note title…"
              value={editTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
            />

            {previewMode ? (
              <div className="notes-content-preview">
                {renderContentWithImages(editContent)}
              </div>
            ) : (
              <textarea
                ref={contentRef}
                className="notes-content-input"
                placeholder="Start writing… Paste images directly to embed them inline."
                value={editContent}
                onChange={(e) => handleContentChange(e.target.value)}
                onPaste={handleContentPaste}
              />
            )}

            {/* ── Attachments ── */}
            <div
              className="notes-attachments"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="notes-attachments-header">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <span>Attachments {attachments.length > 0 ? `(${attachments.length})` : ""}</span>
                <button
                  className="notes-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Add file"
                >
                  {uploading ? "Uploading…" : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add file
                    </>
                  )}
                </button>
                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileInput} />
              </div>

              {attachLoading && <p className="notes-attach-empty">Loading…</p>}

              {!attachLoading && attachments.length === 0 && (
                <p className="notes-attach-empty">Drop files here or click "Add file" to attach images and documents.</p>
              )}

              <div className="notes-attach-grid">
                {attachments.map((att) => (
                  <div key={att.id} className="notes-attach-item">
                    {isImage(att.mime_type) ? (
                      <a href={`/api/notes/${activeId}/attachments/${att.id}`} target="_blank" rel="noopener noreferrer" className="notes-attach-thumb-link">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/notes/${activeId}/attachments/${att.id}`}
                          alt={att.name}
                          className="notes-attach-thumb"
                        />
                      </a>
                    ) : (
                      <a href={`/api/notes/${activeId}/attachments/${att.id}`} target="_blank" rel="noopener noreferrer" className="notes-attach-file-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </a>
                    )}
                    <div className="notes-attach-info">
                      <span className="notes-attach-name" title={att.name}>{att.name}</span>
                      <span className="notes-attach-size">{formatBytes(att.size_bytes)}</span>
                    </div>
                    <button
                      className="notes-attach-delete"
                      onClick={() => void deleteAttachment(att.id)}
                      title="Remove attachment"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
