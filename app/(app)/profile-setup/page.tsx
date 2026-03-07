"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fileToOptimisedDataUrl } from "@/lib/client/avatar-upload";

function isSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type TermEntry = {
  id: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const uploadInputId = useId();

  const nextPath = useMemo(() => {
    const raw = String(searchParams.get("next") || "/dashboard");
    return isSafeNextPath(raw) ? raw : "/dashboard";
  }, [searchParams]);
  useEffect(() => {
    void (async () => {
      const [setupRes, profileRes] = await Promise.all([
        fetch("/api/profile/setup"),
        fetch("/api/profile/terms"),
      ]);

      if (setupRes.ok) {
        const data = await setupRes.json().catch(() => ({}));
        setDisplayName(data?.profileSetup?.displayName ?? "");
        setAvatarUrl(data?.profileSetup?.avatarUrl ?? "");
      }

      if (profileRes.ok) {
        const data = await profileRes.json().catch(() => ({}));
        if (Array.isArray(data?.terms)) {
          setTerms(data.terms.map((term: any, index: number) => ({
            id: String(term?.id || `term-${index}`),
            termName: String(term?.termName || ""),
            termStartDate: String(term?.termStartDate || ""),
            termEndDate: String(term?.termEndDate || ""),
          })));
        }
      }
    })();
  }, []);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFileName(file.name);
    try {
      const value = await fileToOptimisedDataUrl(file, 320, 0.82);
      setAvatarUrl(value);
    } catch {
      setError("Could not process that image. Please try a different file.");
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const [setupRes, profileRes] = await Promise.all([
      fetch("/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl }),
      }),
      fetch("/api/profile/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms }),
      }),
    ]);

    if (!setupRes.ok || !profileRes.ok) {
      const setupData = await setupRes.json().catch(() => ({}));
      const profileData = await profileRes.json().catch(() => ({}));
      setError(setupData?.error || profileData?.error || "Could not save your profile");
      setSaving(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  function addEmptyTerm() {
    setTerms((prev) => [
      ...prev,
      {
        id: `term-${Date.now()}-${prev.length}`,
        termName: "",
        termStartDate: "",
        termEndDate: "",
      },
    ]);
  }

  function updateTerm(id: string, patch: Partial<TermEntry>) {
    setTerms((prev) => prev.map((term) => (term.id === id ? { ...term, ...patch } : term)));
  }

  function removeTerm(id: string) {
    setTerms((prev) => prev.filter((term) => term.id !== id));
  }

  function termIsActive(term: TermEntry) {
    if (!term.termStartDate || !term.termEndDate) return false;
    const today = toISODate(new Date());
    return today >= term.termStartDate && today <= term.termEndDate;
  }

  return (
    <main className="page-wrap">
      <section className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.7rem", letterSpacing: "-0.03em" }}>Set up your profile</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Add your name, photo and current term details so your workspace feels personal from the start.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          <label className="field">
            <span>Name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Joe Bloggs"
              required
            />
          </label>

          <label className="field">
            <span>Profile photo URL (optional)</span>
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          <div style={{ display: "grid", gap: "0.9rem" }}>
            {terms.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                No terms added yet.
              </p>
            ) : (
              terms.map((term, index) => (
                <div key={term.id} style={{ border: "1px solid var(--border)", borderRadius: "14px", padding: "0.95rem", background: "var(--field-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>
                      Term {index + 1}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.28rem 0.7rem",
                          borderRadius: "999px",
                          background: termIsActive(term) ? "rgb(16 185 129 / 0.12)" : "rgb(148 163 184 / 0.14)",
                          color: termIsActive(term) ? "#10b981" : "var(--muted)",
                          border: termIsActive(term) ? "1px solid rgb(16 185 129 / 0.35)" : "1px solid var(--border)",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {termIsActive(term) ? "Active" : "Inactive"}
                      </span>
                      <button type="button" className="button secondary" onClick={() => removeTerm(term.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
                    <label className="field">
                      <span>Term name</span>
                      <input
                        value={term.termName}
                        onChange={(event) => updateTerm(term.id, { termName: event.target.value })}
                        placeholder="e.g. Spring 1"
                      />
                    </label>

                    <label className="field">
                      <span>Start date</span>
                      <input
                        type="date"
                        value={term.termStartDate}
                        onChange={(event) => updateTerm(term.id, { termStartDate: event.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>End date</span>
                      <input
                        type="date"
                        value={term.termEndDate}
                        onChange={(event) => updateTerm(term.id, { termEndDate: event.target.value })}
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
            <div>
              <button type="button" className="button secondary" onClick={addEmptyTerm}>
                Add Term
              </button>
            </div>
          </div>

          <div className="field">
            <input
              id={uploadInputId}
              className="file-upload-input"
              type="file"
              accept="image/*"
              onChange={onFileChange}
            />
            <label htmlFor={uploadInputId} className="landing-thoughts-btn file-upload-cta">
              Upload Photo
            </label>
            <span className="muted" style={{ fontSize: "0.78rem", marginTop: "0.45rem", display: "block" }}>
              {avatarFileName || "No file selected"}
            </span>
          </div>

          {avatarUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <img
                src={avatarUrl}
                alt="Profile preview"
                style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" }}
              />
              <span className="muted" style={{ fontSize: "0.82rem" }}>Photo preview</span>
            </div>
          ) : null}

          {error ? <p style={{ color: "#fc8181", margin: 0 }}>{error}</p> : null}

          <button type="submit" className="nav-btn-cta" disabled={saving} style={{ justifyContent: "center" }}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
