"use client";

import { useEffect, useMemo, useState } from "react";

type LibraryItem = {
  id: string;
  title: string;
  yearGroup: string;
  subject: string;
  topic: string;
  json: string;
  createdAt: string;
};

type LessonPackPreview = {
  year_group?: string;
  subject?: string;
  topic?: string;
  key_vocabulary?: string[];
  learning_objectives?: string[];
  lesson_hook?: string;
  starter_activity?: string;
  main_activity?: string;
  plenary?: string;
  differentiation?: string;
  resources?: string[];
  mini_assessment?: {
    questions?: string[];
    answers?: string[];
  };
};

function parsePack(raw: string): LessonPackPreview | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch {
    return null;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="libraryx-preview-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <p className="muted">None provided.</p>;
  return (
    <ul className="libraryx-list">
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`}>{item}</li>
      ))}
    </ul>
  );
}

function PreviewDocument({ item }: { item: LibraryItem }) {
  const pack = useMemo(() => parsePack(item.json), [item.json]);

  if (!pack) {
    return (
      <div className="libraryx-fallback">
        <p className="muted">Could not parse this lesson pack. Showing raw JSON:</p>
        <pre>{item.json}</pre>
      </div>
    );
  }

  return (
    <article className="libraryx-preview-paper" aria-label="Lesson pack preview snapshot">
      <header className="libraryx-preview-header">
        <h2>{item.title}</h2>
        <p>
          {pack.year_group || item.yearGroup} | {pack.subject || item.subject} | {pack.topic || item.topic}
        </p>
        <p className="libraryx-preview-meta">Saved {new Date(item.createdAt).toLocaleString()}</p>
      </header>

      <Section title="Learning Objectives">
        <BulletList items={pack.learning_objectives} />
      </Section>

      <Section title="Key Vocabulary">
        <BulletList items={pack.key_vocabulary} />
      </Section>

      <Section title="Lesson Sequence">
        <div className="libraryx-sequence-grid">
          <div>
            <h4>Hook</h4>
            <p>{pack.lesson_hook || "Not provided."}</p>
          </div>
          <div>
            <h4>Starter</h4>
            <p>{pack.starter_activity || "Not provided."}</p>
          </div>
          <div>
            <h4>Main Activity</h4>
            <p>{pack.main_activity || "Not provided."}</p>
          </div>
          <div>
            <h4>Plenary</h4>
            <p>{pack.plenary || "Not provided."}</p>
          </div>
        </div>
      </Section>

      <Section title="Differentiation">
        <p>{pack.differentiation || "Not provided."}</p>
      </Section>

      <Section title="Resources">
        <BulletList items={pack.resources} />
      </Section>

      <Section title="Mini Assessment">
        {(pack.mini_assessment?.questions || []).length > 0 ? (
          <ol className="libraryx-assessment-list">
            {(pack.mini_assessment?.questions || []).map((question, i) => (
              <li key={`${question}-${i}`}>
                <p>{question}</p>
                <p className="libraryx-answer">Answer: {pack.mini_assessment?.answers?.[i] || "Not provided."}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">No assessment items provided.</p>
        )}
      </Section>
    </article>
  );
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [status, setStatus] = useState("");

  async function loadLibrary() {
    const res = await fetch("/api/library");
    const data = await res.json();

    if (!res.ok) {
      setStatus(data?.error ?? "Could not load library");
      return;
    }

    setItems(data.items ?? []);
    setStatus("");
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setStatus(data?.error ?? "Delete failed");
      return;
    }

    await loadLibrary();
    if (selected?.id === id) {
      setSelected(null);
    }
  }

  useEffect(() => {
    void loadLibrary();
  }, []);

  return (
    <main className="page-wrap libraryx-wrap">
      <h1>Lesson Library</h1>
      <p className="muted">Saved packs linked to your teacher account.</p>
      {status && <p className="muted">{status}</p>}

      <div className="libraryx-grid">
        <section className="card">
          <h2>Saved Packs</h2>
          <div className="stack">
            {items.length === 0 && <p className="muted">No saved packs yet.</p>}
            {items.map((item) => (
              <div key={item.id} className="libraryx-item-row">
                <p>
                  <strong>{item.title}</strong>
                </p>
                <p className="muted">
                  {item.yearGroup} • {item.subject} • {item.topic}
                </p>
                <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="button" onClick={() => setSelected(item)} type="button">
                    View
                  </button>
                  <button className="button" onClick={() => void deleteItem(item.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Preview</h2>
          {selected ? (
            <PreviewDocument item={selected} />
          ) : (
            <p className="muted">Select a pack to view.</p>
          )}
        </section>
      </div>
    </main>
  );
}
