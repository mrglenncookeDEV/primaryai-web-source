"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { subjectColor } from "@/lib/subjectColor";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fileTypeLabel(mimeType: string | null, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType?.includes("pdf") || ext === "pdf") return "PDF";
  if (mimeType?.includes("word") || ext === "docx" || ext === "doc") return "Word";
  if (mimeType?.includes("sheet") || ext === "xlsx" || ext === "xls") return "Excel";
  if (mimeType?.includes("csv") || ext === "csv") return "CSV";
  if (mimeType?.includes("image") || ["png","jpg","jpeg","gif","svg","webp"].includes(ext)) return "Image";
  if (mimeType?.includes("presentation") || ext === "pptx" || ext === "ppt") return "PPTX";
  if (mimeType?.includes("text") || ["txt","md"].includes(ext)) return "Text";
  return "File";
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconFolder({ open, size = 15 }: { open?: boolean; size?: number }) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <path d="M2 10h20" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBook({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconFile({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconDownload({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconTrash({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconPencil({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconUpload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconPlus({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconExternalLink({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconAll({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconInbox({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 13 16 13 14 16 10 16 8 13 2 13" />
      <path d="M5.45 5.11L2 13v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-7.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconChevronRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function SortIndicator({ col, active, dir }: { col: string; active: string; dir: "asc" | "desc" }) {
  if (col !== active) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ opacity: 0.3 }}>
        <path d="M5 1v8M2 4l3-3 3 3M2 6l3 3 3-3" />
      </svg>
    );
  }
  return dir === "asc" ? (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 6l3-4 3 4" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 4l3 4 3-4" />
    </svg>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

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

// ── Preview: Lesson Pack ──────────────────────────────────────────────────────

function PackPreview({ item }: { item: LessonPackItem }) {
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

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

  async function doExport(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc") {
    if (!pack) return;
    setExporting(format);
    try { await triggerExport(format, pack, slug); } finally { setExporting(null); }
  }

  if (loading) {
    return (
      <div className="lib-preview-loading">
        <div className="lib-preview-spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="lib-preview-body">
      {/* Header */}
      <div className="lib-preview-doc-head">
        <span className="lib-preview-doc-badge" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` }}>
          {item.subject} · {item.year_group}
        </span>
        <h2 className="lib-preview-doc-title">{pack?.topic ?? item.topic}</h2>
        <p className="lib-preview-doc-meta">Saved {formatDate(item.created_at)}</p>
      </div>

      {/* Export actions */}
      <div className="lib-preview-actions">
        <button className="lib-preview-action-btn" onClick={() => doExport("lesson-pdf")} disabled={!pack || !!exporting}>
          <IconDownload size={12} />
          {exporting === "lesson-pdf" ? "Exporting…" : "PDF"}
        </button>
        <button className="lib-preview-action-btn" onClick={() => doExport("slides-pptx")} disabled={!pack || !!exporting}>
          <IconDownload size={12} />
          {exporting === "slides-pptx" ? "Exporting…" : "Slides"}
        </button>
        <button className="lib-preview-action-btn" onClick={() => doExport("worksheet-doc")} disabled={!pack || !!exporting}>
          <IconDownload size={12} />
          {exporting === "worksheet-doc" ? "Exporting…" : "Worksheet"}
        </button>
        <Link href={`/lesson-pack?id=${item.id}`} className="lib-preview-action-btn">
          <IconExternalLink size={12} />
          Open
        </Link>
      </div>

      {!pack ? (
        <p className="lib-preview-no-content">Preview unavailable.</p>
      ) : (
        <div className="lib-preview-sections">
          <PreviewSection label="Learning Objectives">
            <ul className="lib-preview-bullets">
              {(pack.learning_objectives ?? []).map((obj, i) => <li key={i}>{obj}</li>)}
            </ul>
          </PreviewSection>

          <PreviewSection label="Teacher Explanation">
            <p className="lib-preview-prose">{pack.teacher_explanation || "Not provided."}</p>
          </PreviewSection>

          <PreviewSection label="Pupil Explanation">
            <p className="lib-preview-prose">{pack.pupil_explanation || "Not provided."}</p>
          </PreviewSection>

          {pack.worked_example && (
            <PreviewSection label="Worked Example">
              <p className="lib-preview-prose" style={{ whiteSpace: "pre-wrap" }}>{pack.worked_example}</p>
            </PreviewSection>
          )}

          {(pack.common_misconceptions?.length ?? 0) > 0 && (
            <PreviewSection label="Common Misconceptions">
              <ul className="lib-preview-bullets">
                {pack.common_misconceptions.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </PreviewSection>
          )}

          <PreviewSection label="Differentiated Activities">
            <div className="lib-preview-diff-grid">
              <DiffCard label="Support" content={pack.activities?.support} />
              <DiffCard label="Expected" content={pack.activities?.expected} />
              <DiffCard label="Greater Depth" content={pack.activities?.greater_depth} />
            </div>
          </PreviewSection>

          {(pack.send_adaptations?.length ?? 0) > 0 && (
            <PreviewSection label="SEND Adaptations">
              <ul className="lib-preview-bullets">
                {pack.send_adaptations.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </PreviewSection>
          )}

          <PreviewSection label="Plenary">
            <p className="lib-preview-prose">{pack.plenary || "Not provided."}</p>
          </PreviewSection>

          {(pack.mini_assessment?.questions?.length ?? 0) > 0 && (
            <PreviewSection label="Mini Assessment">
              <ol className="lib-preview-assessment">
                {pack.mini_assessment.questions.map((q, i) => (
                  <li key={i}>
                    <p className="lib-preview-prose">{q}</p>
                    <p className="lib-preview-answer">Answer: {pack.mini_assessment.answers?.[i] || "—"}</p>
                  </li>
                ))}
              </ol>
            </PreviewSection>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lib-preview-section">
      <p className="lib-preview-section-label">{label}</p>
      {children}
    </div>
  );
}

function DiffCard({ label, content }: { label: string; content: string }) {
  return (
    <div className="lib-preview-diff-card">
      <p className="lib-preview-diff-label">{label}</p>
      <p className="lib-preview-prose">{content || "Not provided."}</p>
    </div>
  );
}

// ── Preview: Document ─────────────────────────────────────────────────────────

function DocPreview({ item, onDownload }: { item: DocumentItem; onDownload: () => void }) {
  const typeLabel = fileTypeLabel(item.mime_type, item.name);
  return (
    <div className="lib-preview-body">
      <div className="lib-preview-doc-head">
        <span className="lib-preview-doc-badge" style={{ color: "var(--muted)", background: "var(--field-bg)", borderColor: "var(--border)" }}>
          {typeLabel}
        </span>
        <h2 className="lib-preview-doc-title" style={{ wordBreak: "break-word" }}>{item.name}</h2>
        <p className="lib-preview-doc-meta">{formatBytes(item.size_bytes)} · Uploaded {formatDate(item.created_at)}</p>
      </div>
      <div className="lib-preview-actions">
        <button className="lib-preview-action-btn is-primary" onClick={onDownload}>
          <IconDownload size={12} />
          Download file
        </button>
      </div>
    </div>
  );
}

// ── Folder tree item ──────────────────────────────────────────────────────────

function FolderRow({
  folder,
  count,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: Folder;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (n: string) => void;
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

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div onClick={onSelect} className={`lib-tree-item${isSelected ? " is-active" : ""}`}>
      <span className="lib-tree-icon" style={{ color: isSelected ? "var(--accent)" : "#f59e0b" }}>
        <IconFolder open={isSelected} size={14} />
      </span>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          className="lib-tree-rename-input"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="lib-tree-label">{folder.name}</span>
      )}
      {!editing && (
        <>
          <span className="lib-tree-count">{count}</span>
          <span className="lib-tree-actions">
            <button className="lib-tree-action-btn" title="Rename" onClick={startEdit}><IconPencil size={11} /></button>
            <button className="lib-tree-action-btn is-danger" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}><IconTrash size={11} /></button>
          </span>
        </>
      )}
    </div>
  );
}

// ── Row actions (move folder dropdown) ───────────────────────────────────────

function MoveSelect({
  value,
  folders,
  disabled,
  onChange,
}: {
  value: string | null;
  folders: Folder[];
  disabled: boolean;
  onChange: (folderId: string | null) => void;
}) {
  return (
    <select
      className="lib-row-select"
      value={value ?? ""}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value || null); }}
    >
      <option value="">No folder</option>
      {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UNFILED_ID = "__unfiled__";
const ALL_ID = "__all__";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [packs, setPacks] = useState<LessonPackItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(ALL_ID);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [sortCol, setSortCol] = useState<"name" | "type" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);

  // Data loading
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

  // Escape key closes the preview drawer
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedItem(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sort toggle
  function toggleSort(col: "name" | "type" | "date") {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  // Filtered + sorted items
  const visiblePacks = useMemo(() => {
    const base = selectedFolderId === ALL_ID ? packs
      : selectedFolderId === UNFILED_ID ? packs.filter((p) => !p.folder_id)
      : packs.filter((p) => p.folder_id === selectedFolderId);
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? base.filter((p) =>
          [p.title, p.subject, p.topic, p.year_group]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        )
      : base;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name") cmp = a.title.localeCompare(b.title);
      else if (sortCol === "type") cmp = a.subject.localeCompare(b.subject);
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [packs, searchQuery, selectedFolderId, sortCol, sortDir]);

  const visibleDocs = useMemo(() => {
    const base = selectedFolderId === ALL_ID ? documents
      : selectedFolderId === UNFILED_ID ? documents.filter((d) => !d.folder_id)
      : documents.filter((d) => d.folder_id === selectedFolderId);
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? base.filter((d) =>
          [d.name, d.mime_type]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        )
      : base;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name") cmp = a.name.localeCompare(b.name);
      else if (sortCol === "type") cmp = (a.mime_type ?? "").localeCompare(b.mime_type ?? "");
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [documents, searchQuery, selectedFolderId, sortCol, sortDir]);

  // Counts per folder (for badges)
  const folderCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of folders) {
      m[f.id] = packs.filter((p) => p.folder_id === f.id).length + documents.filter((d) => d.folder_id === f.id).length;
    }
    return m;
  }, [folders, packs, documents]);

  const unfiledCount = useMemo(() =>
    packs.filter((p) => !p.folder_id).length + documents.filter((d) => !d.folder_id).length,
    [packs, documents]
  );

  // Folder CRUD
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
    if (!confirm("Delete this folder? Items will move to Unfiled.")) return;
    const res = await fetch(`/api/library/folders/${id}`, { method: "DELETE" });
    if (!res.ok) { setStatus("Could not delete folder"); return; }
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setPacks((prev) => prev.map((p) => p.folder_id === id ? { ...p, folder_id: null } : p));
    setDocuments((prev) => prev.map((d) => d.folder_id === id ? { ...d, folder_id: null } : d));
    if (selectedFolderId === id) setSelectedFolderId(ALL_ID);
  }

  // Move
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

  // Delete
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

  // Upload
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

  function downloadDoc(doc: DocumentItem) {
    const a = document.createElement("a");
    a.href = `/api/library/documents/${doc.id}`;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const totalItems = visiblePacks.length + visibleDocs.length;
  const folderName = selectedFolderId === ALL_ID ? "All Items" : selectedFolderId === UNFILED_ID ? "Unfiled" : (folders.find((f) => f.id === selectedFolderId)?.name ?? "Folder");

  const drawerOpen = selectedItem !== null;

  return (
    <>
    <div className="lib-shell">
      {/* ── Top chrome ── */}
      <div className="lib-chrome">
        <div className="lib-chrome-left">
          <h1 className="lib-chrome-title">Library</h1>
          <div className="lib-chrome-stats">
            <span className="lib-chrome-stat">{packs.length} lesson {packs.length === 1 ? "pack" : "packs"}</span>
            <span className="lib-chrome-stat-divider">·</span>
            <span className="lib-chrome-stat">{documents.length} {documents.length === 1 ? "document" : "documents"}</span>
            <span className="lib-chrome-stat-divider">·</span>
            <span className="lib-chrome-stat">{folders.length} {folders.length === 1 ? "folder" : "folders"}</span>
          </div>
        </div>
        <div className="lib-chrome-right">
          {status && <span className="lib-chrome-error">{status}</span>}
          <div className="lib-chrome-tools">
            <label className="lib-chrome-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search library…"
                className="lib-chrome-search-input"
              />
            </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <button className="lib-chrome-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <IconUpload size={13} />
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <Link href="/lesson-pack" className="lib-chrome-btn is-primary lib-chrome-btn-primary-top">
            <IconPlus size={13} />
            New lesson pack
          </Link>
          </div>
        </div>
      </div>

      {/* ── Workspace ── */}
      <div className="lib-workspace">

        {/* Left: folder tree */}
        <aside className="lib-sidebar">
          <div className="lib-sidebar-section-head">Collections</div>

          <button
            className={`lib-tree-item${selectedFolderId === ALL_ID ? " is-active" : ""}`}
            onClick={() => setSelectedFolderId(ALL_ID)}
          >
            <span className="lib-tree-icon"><IconAll size={14} /></span>
            <span className="lib-tree-label">All Items</span>
            <span className="lib-tree-count">{packs.length + documents.length}</span>
          </button>

          <button
            className={`lib-tree-item${selectedFolderId === UNFILED_ID ? " is-active" : ""}`}
            onClick={() => setSelectedFolderId(UNFILED_ID)}
          >
            <span className="lib-tree-icon"><IconInbox size={14} /></span>
            <span className="lib-tree-label">Unfiled</span>
            <span className="lib-tree-count">{unfiledCount}</span>
          </button>

          {folders.length > 0 && <div className="lib-sidebar-divider" />}

          {folders.length > 0 && (
            <div className="lib-sidebar-section-head" style={{ marginTop: 0 }}>Folders</div>
          )}

          {folders.map((f) => (
            <FolderRow
              key={f.id}
              folder={f}
              count={folderCounts[f.id] ?? 0}
              isSelected={selectedFolderId === f.id}
              onSelect={() => setSelectedFolderId(f.id)}
              onRename={(name) => renameFolder(f.id, name)}
              onDelete={() => deleteFolder(f.id)}
            />
          ))}

          <div className="lib-sidebar-divider" />

          {creatingFolder ? (
            <div className="lib-new-folder-row">
              <input
                ref={newFolderRef}
                value={newFolderName}
                className="lib-new-folder-input"
                placeholder="Folder name"
                autoFocus
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createFolder();
                  if (e.key === "Escape") setCreatingFolder(false);
                }}
              />
              <button className="lib-new-folder-confirm" onClick={() => void createFolder()}>Add</button>
              <button className="lib-new-folder-cancel" onClick={() => setCreatingFolder(false)}>×</button>
            </div>
          ) : (
            <button className="lib-tree-item lib-new-folder-btn" onClick={() => setCreatingFolder(true)}>
              <span className="lib-tree-icon" style={{ opacity: 0.5 }}><IconPlus size={13} /></span>
              <span className="lib-tree-label" style={{ color: "var(--muted)" }}>New folder</span>
            </button>
          )}
        </aside>

        {/* Centre: file list */}
        <main className="lib-list-pane">
          <div className="lib-list-chrome">
            <div className="lib-list-breadcrumb">
              <span className="lib-list-folder-name">{folderName}</span>
              <span className="lib-list-count">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {totalItems === 0 ? (
            <div className="lib-empty">
              <div className="lib-empty-icon"><IconFolder size={32} /></div>
              <p className="lib-empty-title">{selectedFolderId === ALL_ID ? "Your library is empty" : "This folder is empty"}</p>
              <p className="lib-empty-sub">Generate a lesson pack or upload a document to get started.</p>
              <div className="lib-empty-actions">
                <Link href="/lesson-pack" className="lib-chrome-btn is-primary"><IconPlus size={13} /> New lesson pack</Link>
                <button className="lib-chrome-btn" onClick={() => fileInputRef.current?.click()}><IconUpload size={13} /> Upload file</button>
              </div>
            </div>
          ) : (
            <table className="lib-table">
              <thead>
                <tr className="lib-table-head-row">
                  <th className="lib-th lib-th-name">
                    <button className="lib-sort-btn" onClick={() => toggleSort("name")}>
                      Name <SortIndicator col="name" active={sortCol} dir={sortDir} />
                    </button>
                  </th>
                  <th className="lib-th lib-th-type">
                    <button className="lib-sort-btn" onClick={() => toggleSort("type")}>
                      Type <SortIndicator col="type" active={sortCol} dir={sortDir} />
                    </button>
                  </th>
                  <th className="lib-th lib-th-date">
                    <button className="lib-sort-btn" onClick={() => toggleSort("date")}>
                      Modified <SortIndicator col="date" active={sortCol} dir={sortDir} />
                    </button>
                  </th>
                  <th className="lib-th lib-th-folder">Folder</th>
                  <th className="lib-th lib-th-actions" />
                </tr>
              </thead>
              <tbody>
                {visiblePacks.map((pack) => {
                  const color = subjectColor(pack.subject);
                  const isActive = selectedItem?.kind === "pack" && selectedItem.item.id === pack.id;
                  return (
                    <tr
                      key={pack.id}
                      className={`lib-row${isActive ? " is-active" : ""}`}
                      onClick={() => setSelectedItem({ kind: "pack", item: pack })}
                    >
                      <td className="lib-td lib-td-name">
                        <span className="lib-row-file-icon" style={{ color }}>
                          <IconBook size={15} />
                        </span>
                        <span className="lib-row-name">{pack.title}</span>
                        <span className="lib-row-meta">{pack.year_group}</span>
                      </td>
                      <td className="lib-td lib-td-type">
                        <span className="lib-type-badge" style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)`, borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}>
                          {pack.subject}
                        </span>
                      </td>
                      <td className="lib-td lib-td-date">{formatDate(pack.created_at)}</td>
                      <td className="lib-td lib-td-folder">
                        <MoveSelect value={pack.folder_id} folders={folders} disabled={movingId === pack.id} onChange={(fid) => movePackToFolder(pack.id, fid)} />
                      </td>
                      <td className="lib-td lib-td-actions">
                        <div className="lib-row-actions">
                          <Link href={`/lesson-pack?id=${pack.id}`} className="lib-row-btn" title="Open" onClick={(e) => e.stopPropagation()}>
                            <IconExternalLink size={13} />
                          </Link>
                          <button className="lib-row-btn is-danger" title="Delete" onClick={(e) => { e.stopPropagation(); void deletePack(pack.id); }}>
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {visibleDocs.map((doc) => {
                  const typeLabel = fileTypeLabel(doc.mime_type, doc.name);
                  const isActive = selectedItem?.kind === "doc" && selectedItem.item.id === doc.id;
                  return (
                    <tr
                      key={doc.id}
                      className={`lib-row${isActive ? " is-active" : ""}`}
                      onClick={() => setSelectedItem({ kind: "doc", item: doc })}
                    >
                      <td className="lib-td lib-td-name">
                        <span className="lib-row-file-icon" style={{ color: "var(--muted)" }}>
                          <IconFile size={15} />
                        </span>
                        <span className="lib-row-name">{doc.name}</span>
                        <span className="lib-row-meta">{formatBytes(doc.size_bytes)}</span>
                      </td>
                      <td className="lib-td lib-td-type">
                        <span className="lib-type-badge">{typeLabel}</span>
                      </td>
                      <td className="lib-td lib-td-date">{formatDate(doc.created_at)}</td>
                      <td className="lib-td lib-td-folder">
                        <MoveSelect value={doc.folder_id} folders={folders} disabled={movingId === doc.id} onChange={(fid) => moveDocToFolder(doc.id, fid)} />
                      </td>
                      <td className="lib-td lib-td-actions">
                        <div className="lib-row-actions">
                          <button className="lib-row-btn" title="Download" onClick={(e) => { e.stopPropagation(); downloadDoc(doc); }}>
                            <IconDownload size={13} />
                          </button>
                          <button className="lib-row-btn is-danger" title="Delete" onClick={(e) => { e.stopPropagation(); void deleteDoc(doc.id); }}>
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </main>

        {/* Right: preview rail — always shows placeholder */}
        <aside className="lib-preview-rail">
          <div className="lib-preview-empty">
            {/* Document + magnifying glass illustration */}
            <svg
              className="lib-preview-empty-illustration"
              viewBox="0 0 120 130"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Document body */}
              <rect x="12" y="8" width="72" height="90" rx="6" fill="rgb(var(--accent-rgb) / 0.15)" stroke="rgb(var(--accent-rgb) / 0.35)" strokeWidth="2.5" />
              {/* Folded corner */}
              <path d="M60 8 L84 8 L84 26 Z" fill="rgb(var(--accent-rgb) / 0.25)" stroke="rgb(var(--accent-rgb) / 0.35)" strokeWidth="2" strokeLinejoin="round" />
              {/* Text lines */}
              <rect x="24" y="36" width="44" height="5" rx="2.5" fill="rgb(var(--accent-rgb) / 0.4)" />
              <rect x="24" y="48" width="38" height="5" rx="2.5" fill="rgb(var(--accent-rgb) / 0.3)" />
              <rect x="24" y="60" width="42" height="5" rx="2.5" fill="rgb(var(--accent-rgb) / 0.3)" />
              <rect x="24" y="72" width="30" height="5" rx="2.5" fill="rgb(var(--accent-rgb) / 0.2)" />
              {/* Magnifying glass circle */}
              <circle cx="82" cy="90" r="24" fill="rgb(var(--accent-rgb) / 0.12)" stroke="rgb(var(--accent-rgb) / 0.5)" strokeWidth="6" />
              {/* Magnifying glass inner highlight */}
              <circle cx="76" cy="84" r="5" fill="rgb(var(--accent-rgb) / 0.2)" />
              {/* Magnifying glass handle */}
              <line x1="99" y1="107" x2="113" y2="121" stroke="rgb(var(--accent-rgb) / 0.55)" strokeWidth="7" strokeLinecap="round" />
            </svg>
            <p className="lib-preview-empty-heading">Nothing selected</p>
            <p className="lib-preview-empty-text">Click any item in the list to preview it here</p>
          </div>
        </aside>

      </div>
    </div>

    {/* Backdrop */}
    {drawerOpen && (
      <div
        className="lib-drawer-backdrop"
        onClick={() => setSelectedItem(null)}
        aria-hidden="true"
      />
    )}

    {/* Preview drawer */}
    <div
      className={`lib-drawer${drawerOpen ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <div className="lib-drawer-header">
        <button
          className="lib-drawer-close"
          onClick={() => setSelectedItem(null)}
          title="Close preview"
        >
          <IconChevronRight size={18} />
          <span>Close preview</span>
        </button>
        {selectedItem && (
          <span className="lib-drawer-title">
            {selectedItem.kind === "pack" ? selectedItem.item.title : selectedItem.item.name}
          </span>
        )}
      </div>
      <div className="lib-drawer-content">
        {selectedItem && (
          selectedItem.kind === "pack"
            ? <PackPreview item={selectedItem.item} />
            : <DocPreview item={selectedItem.item} onDownload={() => downloadDoc(selectedItem.item)} />
        )}
      </div>
    </div>
    </>
  );
}
