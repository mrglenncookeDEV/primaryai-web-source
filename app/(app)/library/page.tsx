"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { subjectColor } from "@/lib/subjectColor";

// ── Types ──────────────────────────────────────────────────────────────────────

type Folder = { id: string; name: string; created_at: string };

type LessonPackItem = {
  id: string;
  title: string;
  year_group: string;
  subject: string;
  topic: string;
  folder_id: string | null;
  created_at: string;
  json?: string;
};

type DocumentItem = {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string | null;
  folder_id: string | null;
  created_at: string;
};

type SelectedItem =
  | { kind: "pack"; item: LessonPackItem }
  | { kind: "doc"; item: DocumentItem };

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function parsePack(raw: string): LessonPack | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as LessonPack;
    return null;
  } catch { return null; }
}

function fileIcon(mimeType: string | null, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType?.includes("pdf") || ext === "pdf") return "📄";
  if (mimeType?.includes("word") || ext === "docx" || ext === "doc") return "📝";
  if (mimeType?.includes("sheet") || ext === "xlsx" || ext === "xls" || ext === "csv") return "📊";
  if (mimeType?.includes("image") || ["png","jpg","jpeg","gif","svg","webp"].includes(ext)) return "🖼";
  if (mimeType?.includes("presentation") || ext === "pptx" || ext === "ppt") return "📊";
  if (mimeType?.includes("text") || ["txt","md","json","tsv"].includes(ext)) return "📋";
  return "📎";
}

// ── Export ─────────────────────────────────────────────────────────────────────

async function triggerExport(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc", pack: LessonPack, slug: string) {
  const res = await fetch("/api/lesson-pack/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, pack }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const header = res.headers.get("content-disposition") || "";
  const filenameMatch = /filename="?([^";]+)"?/i.exec(header);
  const ext = format === "lesson-pdf" ? ".pdf" : format === "slides-pptx" ? ".pptx" : ".doc";
  const filename = filenameMatch?.[1] || `${slug}${ext}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
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
  return <ul className="libraryx-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

function ActivityCard({ label, content }: { label: string; content: string }) {
  return (
    <div style={{ border: "1px solid #dbe3ee", borderRadius: "10px", padding: "0.6rem 0.75rem", background: "rgb(255 255 255 / 0.75)" }}>
      <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "#1e293b" }}>{content || "Not provided."}</p>
    </div>
  );
}

function ExportBar({ pack, slug }: { pack: LessonPack; slug: string }) {
  const [exporting, setExporting] = useState<string | null>(null);
  async function doExport(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc") {
    setExporting(format);
    try { await triggerExport(format, pack, slug); } finally { setExporting(null); }
  }
  const btn: React.CSSProperties = {
    padding: "0.4rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border-card)",
    background: "var(--surface)", color: "var(--muted)", fontSize: "0.78rem",
    fontFamily: "inherit", cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid #e2e8f0" }}>
      <button style={btn} onClick={() => doExport("lesson-pdf")} disabled={!!exporting}>{exporting === "lesson-pdf" ? "Downloading…" : "🖨 Export PDF"}</button>
      <button style={btn} onClick={() => doExport("slides-pptx")} disabled={!!exporting}>{exporting === "slides-pptx" ? "Downloading…" : "📊 Export PPTX"}</button>
      <button style={btn} onClick={() => doExport("worksheet-doc")} disabled={!!exporting}>{exporting === "worksheet-doc" ? "Downloading…" : "📄 Export Worksheet"}</button>
    </div>
  );
}

function PackPreview({ item }: { item: LessonPackItem }) {
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item.json) { setPack(parsePack(item.json)); return; }
    setLoading(true);
    fetch(`/api/library/${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((d) => { if (d.item?.json) setPack(parsePack(d.item.json)); })
      .finally(() => setLoading(false));
  }, [item.id, item.json]);

  const color = subjectColor(item.subject);
  const slug = `${item.subject}-${item.topic}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>;
  if (!pack) return <div style={{ padding: "2rem", color: "var(--muted)" }}>Preview unavailable.</div>;

  return (
    <article className="libraryx-preview-paper">
      <header className="libraryx-preview-header">
        <span style={{
          display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: "999px",
          fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.35rem",
          background: `color-mix(in srgb, ${color} 15%, transparent)`, color,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        }}>{pack.year_group} · {pack.subject}</span>
        <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.15rem" }}>{pack.topic}</h2>
        <p className="libraryx-preview-meta">Saved {formatDate(item.created_at)}</p>
        <ExportBar pack={pack} slug={slug} />
      </header>
      <Section title="Learning Objectives"><BulletList items={pack.learning_objectives} /></Section>
      <Section title="Teacher Explanation"><p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b" }}>{pack.teacher_explanation || "Not provided."}</p></Section>
      <Section title="Pupil Explanation"><p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b" }}>{pack.pupil_explanation || "Not provided."}</p></Section>
      <Section title="Worked Example"><p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b", whiteSpace: "pre-wrap" }}>{pack.worked_example || "Not provided."}</p></Section>
      <Section title="Common Misconceptions"><BulletList items={pack.common_misconceptions} /></Section>
      <Section title="Differentiated Activities">
        <div className="libraryx-sequence-grid">
          <ActivityCard label="Support" content={pack.activities?.support} />
          <ActivityCard label="Expected" content={pack.activities?.expected} />
          <ActivityCard label="Greater Depth" content={pack.activities?.greater_depth} />
        </div>
      </Section>
      <Section title="SEND Adaptations"><BulletList items={pack.send_adaptations} /></Section>
      <Section title="Review and Reflect"><p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: "#1e293b" }}>{pack.plenary || "Not provided."}</p></Section>
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
        ) : <p style={{ color: "var(--muted)", margin: 0 }}>No assessment items provided.</p>}
      </Section>
    </article>
  );
}

function DocPreview({ item, onDownload }: { item: DocumentItem; onDownload: () => void }) {
  return (
    <div className="libraryx-preview-paper" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{fileIcon(item.mime_type, item.name)}</div>
        <h2 style={{ margin: "0 0 0.3rem", fontSize: "1.1rem", wordBreak: "break-word" }}>{item.name}</h2>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
          {formatBytes(item.size_bytes)} · Uploaded {formatDate(item.created_at)}
        </p>
      </div>
      <button
        onClick={onDownload}
        style={{
          alignSelf: "flex-start", padding: "0.55rem 1.1rem", borderRadius: "10px",
          border: "1.5px solid var(--border)", background: "var(--surface)",
          color: "var(--text)", fontSize: "0.84rem", fontFamily: "inherit", cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Download file
      </button>
    </div>
  );
}

// ── Folder sidebar item ────────────────────────────────────────────────────────

function FolderItem({
  folder,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: Folder;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(folder.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div
      onClick={onSelect}
      className={`libraryx-folder-item${isSelected ? " is-selected" : ""}`}
    >
      <span style={{ flexShrink: 0, opacity: 0.8 }}>📁</span>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1, border: "1px solid var(--accent)", borderRadius: "5px",
            padding: "0.15rem 0.35rem", fontSize: "0.84rem", fontFamily: "inherit",
            background: "var(--surface)", color: "var(--text)", outline: "none",
          }}
        />
      ) : (
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
      )}
      {!editing && (
        <span style={{ display: "flex", gap: "0.15rem", flexShrink: 0 }}>
          <button
            title="Rename"
            onClick={startEdit}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1 }}
          >✏️</button>
          <button
            title="Delete folder"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1 }}
          >🗑</button>
        </span>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const UNFILED_ID = "__unfiled__";
const ALL_ID = "__all__";

export default function LibraryPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [packs, setPacks] = useState<LessonPackItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(ALL_ID);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/library/folders");
    const data = await res.json();
    if (res.ok) setFolders(data.folders ?? []);
  }, []);

  const loadPacks = useCallback(async () => {
    const res = await fetch("/api/library?view=summary&limit=300");
    const data = await res.json();
    if (res.ok) setPacks(data.items ?? []);
  }, []);

  const loadDocuments = useCallback(async () => {
    const res = await fetch("/api/library/documents");
    const data = await res.json();
    if (res.ok) setDocuments(data.documents ?? []);
  }, []);

  useEffect(() => {
    void loadFolders();
    void loadPacks();
    void loadDocuments();
  }, [loadFolders, loadPacks, loadDocuments]);

  // ── Filtered items for current folder ──────────────────────────────────────

  const visiblePacks = useMemo(() => {
    if (selectedFolderId === ALL_ID) return packs;
    if (selectedFolderId === UNFILED_ID) return packs.filter((p) => !p.folder_id);
    return packs.filter((p) => p.folder_id === selectedFolderId);
  }, [packs, selectedFolderId]);

  const visibleDocs = useMemo(() => {
    if (selectedFolderId === ALL_ID) return documents;
    if (selectedFolderId === UNFILED_ID) return documents.filter((d) => !d.folder_id);
    return documents.filter((d) => d.folder_id === selectedFolderId);
  }, [documents, selectedFolderId]);

  const totalItems = visiblePacks.length + visibleDocs.length;

  // ── Folder CRUD ─────────────────────────────────────────────────────────────

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const res = await fetch("/api/library/folders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error ?? "Could not create folder"); return; }
    setFolders((prev) => [...prev, data.folder].sort((a, b) => a.name.localeCompare(b.name)));
    setNewFolderName("");
    setCreatingFolder(false);
    setSelectedFolderId(data.folder.id);
  }

  async function renameFolder(id: string, newName: string) {
    const res = await fetch(`/api/library/folders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) { setStatus("Could not rename folder"); return; }
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name: newName } : f).sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteFolder(id: string) {
    if (!confirm("Delete this folder? Items inside will be moved to Unfiled.")) return;
    const res = await fetch(`/api/library/folders/${id}`, { method: "DELETE" });
    if (!res.ok) { setStatus("Could not delete folder"); return; }
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setPacks((prev) => prev.map((p) => p.folder_id === id ? { ...p, folder_id: null } : p));
    setDocuments((prev) => prev.map((d) => d.folder_id === id ? { ...d, folder_id: null } : d));
    if (selectedFolderId === id) setSelectedFolderId(ALL_ID);
  }

  // ── Move to folder ──────────────────────────────────────────────────────────

  async function movePackToFolder(packId: string, folderId: string | null) {
    setMovingId(packId);
    await fetch(`/api/library/${packId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    });
    setPacks((prev) => prev.map((p) => p.id === packId ? { ...p, folder_id: folderId } : p));
    setMovingId(null);
  }

  async function moveDocToFolder(docId: string, folderId: string | null) {
    setMovingId(docId);
    await fetch(`/api/library/documents/${docId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    });
    setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, folder_id: folderId } : d));
    setMovingId(null);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function deletePack(id: string) {
    if (!confirm("Delete this lesson pack? This cannot be undone.")) return;
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (!res.ok) { setStatus("Could not delete lesson pack"); return; }
    setPacks((prev) => prev.filter((p) => p.id !== id));
    if (selectedItem?.kind === "pack" && selectedItem.item.id === id) setSelectedItem(null);
  }

  async function deleteDoc(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const res = await fetch(`/api/library/documents/${id}`, { method: "DELETE" });
    if (!res.ok) { setStatus("Could not delete document"); return; }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedItem?.kind === "doc" && selectedItem.item.id === id) setSelectedItem(null);
  }

  // ── Document upload ─────────────────────────────────────────────────────────

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatus("");
    const folderId = selectedFolderId !== ALL_ID && selectedFolderId !== UNFILED_ID ? selectedFolderId : null;

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      if (folderId) form.append("folder_id", folderId);

      const res = await fetch("/api/library/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? `Could not upload ${file.name}`);
      } else {
        setDocuments((prev) => [data.document, ...prev]);
      }
    }
    setUploading(false);
  }

  // ── Download document ───────────────────────────────────────────────────────

  function downloadDoc(doc: DocumentItem) {
    const a = document.createElement("a");
    a.href = `/api/library/documents/${doc.id}`;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Folder select options ───────────────────────────────────────────────────

  const folderOptions = [
    { value: "", label: "No folder (Unfiled)" },
    ...folders.map((f) => ({ value: f.id, label: f.name })),
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  const sidebarBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.45rem 0.75rem", borderRadius: "8px", cursor: "pointer",
    fontSize: "0.84rem", border: "none", fontFamily: "inherit", textAlign: "left", width: "100%",
  };

  return (
    <main className="page-wrap libraryx-shell" style={{ maxWidth: "none" }}>
      {/* Header */}
      <div className="libraryx-topbar">
        <div className="libraryx-hero-card">
          <div className="libraryx-hero-copy">
            <p className="libraryx-kicker">Lesson Library</p>
            <h1 className="libraryx-title">Library</h1>
            <p className="libraryx-subtitle">
              A structured workspace for lesson packs, uploads, and reference material.
            </p>
          </div>
          <div className="libraryx-stat-strip" aria-label="Library overview">
            <div className="libraryx-stat-chip">
              <span className="libraryx-stat-chip-label">Lesson packs</span>
              <strong>{packs.length}</strong>
            </div>
            <div className="libraryx-stat-chip">
              <span className="libraryx-stat-chip-label">Documents</span>
              <strong>{documents.length}</strong>
            </div>
            <div className="libraryx-stat-chip">
              <span className="libraryx-stat-chip-label">Folders</span>
              <strong>{folders.length}</strong>
            </div>
          </div>
        </div>
        <div className="libraryx-toolbar">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <Link href="/lesson-pack" className="libraryx-toolbar-btn is-primary">
            New Lesson Pack
          </Link>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="libraryx-toolbar-btn"
          >
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </div>
      </div>

      {status && <p style={{ color: "#f87171", marginBottom: "1rem", fontSize: "0.85rem" }}>{status}</p>}

      {/* Three-column layout */}
      <div className="libraryx-workspace">

        {/* ── Sidebar ── */}
        <aside className="libraryx-sidebar">
          <div className="libraryx-pane-head">
            <div>
              <p className="libraryx-pane-eyebrow">Collections</p>
              <h2 className="libraryx-pane-title">Folders</h2>
            </div>
          </div>
          <button
            style={{
              ...sidebarBtn,
              background: selectedFolderId === ALL_ID ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
              color: selectedFolderId === ALL_ID ? "var(--accent)" : "var(--text)",
              fontWeight: selectedFolderId === ALL_ID ? 600 : 400,
            }}
            onClick={() => setSelectedFolderId(ALL_ID)}
          >
            <span>📚</span> All items
          </button>

          <button
            style={{
              ...sidebarBtn,
              background: selectedFolderId === UNFILED_ID ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
              color: selectedFolderId === UNFILED_ID ? "var(--accent)" : "var(--text)",
              fontWeight: selectedFolderId === UNFILED_ID ? 600 : 400,
            }}
            onClick={() => setSelectedFolderId(UNFILED_ID)}
          >
            <span>📋</span> Unfiled
          </button>

          {folders.length > 0 && (
            <div style={{ height: "1px", background: "var(--border)", margin: "0.4rem 0.25rem" }} />
          )}

          {folders.map((f) => (
            <FolderItem
              key={f.id}
              folder={f}
              isSelected={selectedFolderId === f.id}
              onSelect={() => setSelectedFolderId(f.id)}
              onRename={(name) => renameFolder(f.id, name)}
              onDelete={() => deleteFolder(f.id)}
            />
          ))}

          <div style={{ height: "1px", background: "var(--border)", margin: "0.4rem 0.25rem" }} />

          {creatingFolder ? (
            <div style={{ padding: "0.25rem 0.5rem", display: "flex", gap: "0.35rem" }}>
              <input
                ref={newFolderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void createFolder(); if (e.key === "Escape") setCreatingFolder(false); }}
                placeholder="Folder name"
                autoFocus
                style={{
                  flex: 1, border: "1px solid var(--accent)", borderRadius: "5px",
                  padding: "0.25rem 0.4rem", fontSize: "0.82rem", fontFamily: "inherit",
                  background: "var(--surface)", color: "var(--text)", outline: "none", minWidth: 0,
                }}
              />
              <button
                onClick={() => void createFolder()}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: "0.8rem", fontFamily: "inherit", padding: "0 0.25rem" }}
              >Add</button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              style={{ ...sidebarBtn, color: "var(--muted)", background: "transparent" }}
            >
              <span>+</span> New folder
            </button>
          )}
        </aside>

        {/* ── Item list ── */}
        <section className="libraryx-list-pane">
          <div className="libraryx-pane-head">
            <div>
              <p className="libraryx-pane-eyebrow">Directory</p>
              <h2 className="libraryx-pane-title">
                {selectedFolderId === ALL_ID ? "All items" : selectedFolderId === UNFILED_ID ? "Unfiled" : (folders.find((f) => f.id === selectedFolderId)?.name || "Folder")}
              </h2>
            </div>
            <span className="libraryx-pane-count">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
          </div>
          {totalItems === 0 && (
            <div className="libraryx-empty-state">
              <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.88rem" }}>
                {selectedFolderId === ALL_ID ? "Nothing saved yet." : "This folder is empty."}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/lesson-pack" style={{
                  padding: "0.45rem 1rem", borderRadius: "10px",
                  background: "var(--accent)", color: "var(--accent-text)",
                  textDecoration: "none", fontSize: "0.82rem", fontWeight: 600,
                }}>Generate a lesson pack</Link>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "0.45rem 1rem", borderRadius: "10px",
                    border: "1.5px solid var(--border)", background: "var(--surface)",
                    color: "var(--text)", fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                  }}
                >Upload document</button>
              </div>
            </div>
          )}

          {/* Lesson packs */}
          {visiblePacks.length > 0 && (
            <>
              <p className="libraryx-section-label">
                Lesson Packs ({visiblePacks.length})
              </p>
              {visiblePacks.map((pack) => {
                const color = subjectColor(pack.subject);
                const isSelected = selectedItem?.kind === "pack" && selectedItem.item.id === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedItem({ kind: "pack", item: pack })}
                    className={`libraryx-record-card${isSelected ? " is-selected" : ""}`}
                    style={{
                      borderColor: isSelected ? color : undefined,
                      background: isSelected ? `color-mix(in srgb, ${color} 6%, var(--surface))` : undefined,
                      boxShadow: isSelected ? `inset 3px 0 0 ${color}` : undefined,
                    }}
                  >
                    <div className="libraryx-record-head">
                      <div>
                        <p style={{ margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>{pack.title}</p>
                        <div className="libraryx-record-meta">
                          <span className="libraryx-record-tag" style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                            {pack.subject}
                          </span>
                          <span>{pack.year_group}</span>
                          <span>{formatDate(pack.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="libraryx-record-actions">
                      <Link
                        href={`/lesson-pack?id=${pack.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="libraryx-inline-btn"
                      >Open in generator ↗</Link>
                      <select
                        value={pack.folder_id ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); void movePackToFolder(pack.id, e.target.value || null); }}
                        disabled={movingId === pack.id}
                        className="libraryx-inline-select"
                      >
                        {folderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); void deletePack(pack.id); }}
                        className="libraryx-inline-btn"
                      >Delete</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Documents */}
          {visibleDocs.length > 0 && (
            <>
              <p className="libraryx-section-label" style={{ marginTop: visiblePacks.length > 0 ? "0.75rem" : 0 }}>
                Documents ({visibleDocs.length})
              </p>
              {visibleDocs.map((doc) => {
                const isSelected = selectedItem?.kind === "doc" && selectedItem.item.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedItem({ kind: "doc", item: doc })}
                    className={`libraryx-record-card${isSelected ? " is-selected" : ""}`}
                    style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem" }}
                  >
                    <span style={{ fontSize: "1.1rem", flexShrink: 0, lineHeight: 1.2 }}>{fileIcon(doc.mime_type, doc.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 0.18rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</p>
                      <div className="libraryx-record-meta">
                        <span>{formatBytes(doc.size_bytes)}</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      <div className="libraryx-record-actions" style={{ marginTop: "0.55rem" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}
                          className="libraryx-inline-btn"
                        >Download</button>
                        <select
                          value={doc.folder_id ?? ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { e.stopPropagation(); void moveDocToFolder(doc.id, e.target.value || null); }}
                          disabled={movingId === doc.id}
                          className="libraryx-inline-select"
                        >
                          {folderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); void deleteDoc(doc.id); }}
                          className="libraryx-inline-btn"
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>

        {/* ── Preview panel ── */}
        <section className="libraryx-preview-pane">
          <div className="libraryx-pane-head">
            <div>
              <p className="libraryx-pane-eyebrow">Preview</p>
              <h2 className="libraryx-pane-title">Inspector</h2>
            </div>
          </div>
          {selectedItem ? (
            selectedItem.kind === "pack" ? (
              <PackPreview item={selectedItem.item} />
            ) : (
              <DocPreview item={selectedItem.item} onDownload={() => downloadDoc(selectedItem.item)} />
            )
          ) : (
            <div className="libraryx-empty-state" style={{ minHeight: "320px" }}>
              Select an item to preview it here.
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
