"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fileToOptimisedDataUrl } from "@/lib/client/avatar-upload";

function isSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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
      const res = await fetch("/api/profile/setup");
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      setDisplayName(data?.profileSetup?.displayName ?? "");
      setAvatarUrl(data?.profileSetup?.avatarUrl ?? "");
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

    const res = await fetch("/api/profile/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, avatarUrl }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Could not save your profile");
      setSaving(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <main className="page-wrap">
      <section className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.7rem", letterSpacing: "-0.03em" }}>Set up your profile</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Add your name and photo so your workspace feels personal from the start.
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
