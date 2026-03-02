"use client";

import { FormEvent, useState } from "react";

type LessonPackResponse = Record<string, unknown> | { error: string };
type ProviderStatus = { id: string; available: boolean };

export default function LessonPackPage() {
  const [form, setForm] = useState({ year_group: "", subject: "", topic: "" });
  const [result, setResult] = useState<LessonPackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);

  async function refreshProviders() {
    const res = await fetch("/api/lesson-pack/providers");
    const data = await res.json();
    setProviders(Array.isArray(data?.providers) ? data.providers : []);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/lesson-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 840, margin: "0 auto" }}>
      <h1>Lesson Pack Generator</h1>
      <div style={{ marginBottom: "0.75rem" }}>
        <button type="button" onClick={refreshProviders}>
          Check Provider Availability
        </button>
        {providers.length > 0 && (
          <pre style={{ marginTop: "0.75rem" }}>{JSON.stringify(providers, null, 2)}</pre>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <input
          placeholder="Year Group (Reception or Year 1-6)"
          value={form.year_group}
          onChange={(e) => setForm({ ...form, year_group: e.target.value })}
        />
        <input
          placeholder="Subject (e.g. Maths, English, Science, Geography)"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <input
          placeholder="Topic"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
      {result && <pre style={{ marginTop: "1rem" }}>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
