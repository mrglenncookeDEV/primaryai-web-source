"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

type Profile = {
  defaultYearGroup: string;
  defaultSubject: string;
  tone: string;
  schoolType: string;
  sendFocus: boolean;
  autoSave: boolean;
};

const INITIAL_PROFILE: Profile = {
  defaultYearGroup: "Year 4",
  defaultSubject: "Maths",
  tone: "professional_uk",
  schoolType: "primary",
  sendFocus: false,
  autoSave: false,
};

const YEAR_GROUPS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

const SUBJECT_GROUPS = [
  { label: "Core Subjects", subjects: ["Maths", "English", "Science"] },
  { label: "Humanities", subjects: ["History", "Geography"] },
  { label: "Arts & Technology", subjects: ["Art and Design", "Design and Technology", "Music", "Computing"] },
  { label: "Physical & Wellbeing", subjects: ["PE", "PSHE", "RE"] },
  { label: "Languages", subjects: ["French", "Spanish", "German", "Mandarin"] },
];

const TONE_OPTIONS = [
  { value: "professional_uk", label: "Professional", desc: "Formal British English, curriculum-precise" },
  { value: "warm", label: "Warm & Friendly", desc: "Approachable, encouraging language" },
  { value: "strict", label: "Direct & Concise", desc: "Clear, no-nonsense instructions" },
];

const SCHOOL_TYPE_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "infant", label: "Infant" },
  { value: "junior", label: "Junior" },
  { value: "SEND", label: "SEND School" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 style={{
      margin: "0 0 0.35rem",
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color: "var(--accent)",
    }}>{children}</h2>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", cursor: "pointer" }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 500, color: "var(--text)" }}>{label}</p>
        {desc && <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.45 }}>{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        style={{
          flexShrink: 0,
          width: "44px",
          height: "24px",
          borderRadius: "999px",
          border: "none",
          padding: "2px",
          cursor: "pointer",
          background: checked ? "var(--accent)" : "var(--border)",
          transition: "background 200ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <span style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "white",
          display: "block",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transition: "none",
        }} />
      </button>
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--field-bg)",
  color: "var(--text)",
  borderRadius: "10px",
  padding: "0.62rem 2.2rem 0.62rem 0.75rem",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  outline: "none",
  cursor: "pointer",
  width: "100%",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2393a4bf' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  transition: "border-color 180ms ease",
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok && data?.profile) {
        setProfile({
          defaultYearGroup: data.profile.defaultYearGroup ?? INITIAL_PROFILE.defaultYearGroup,
          defaultSubject: data.profile.defaultSubject ?? INITIAL_PROFILE.defaultSubject,
          tone: data.profile.tone ?? INITIAL_PROFILE.tone,
          schoolType: data.profile.schoolType ?? INITIAL_PROFILE.schoolType,
          sendFocus: Boolean(data.profile.sendFocus),
          autoSave: Boolean(data.profile.autoSave),
        });
      }
    })();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (res.ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      const data = await res.json();
      setStatus("error");
      setErrorMsg(data?.error ?? "Save failed. Please try again.");
    }
  }

  const isSaving = status === "saving";

  return (
    <main className="page-wrap" style={{ maxWidth: 680 }}>

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{
          margin: "0 0 0.35rem",
          fontSize: "1.6rem",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "var(--text)",
        }}>Teacher Settings</h1>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5 }}>
          Personalise how Primary AI generates content for your class.
        </p>
      </div>

      <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Defaults ── */}
        <div className="card">
          <SectionLabel>Defaults</SectionLabel>
          <p style={{ margin: "0 0 1.1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Pre-fill the lesson pack form with your typical class.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
            <div className="field">
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.4rem", display: "block" }}>
                Year Group
              </label>
              <select
                value={profile.defaultYearGroup}
                onChange={(e) => setProfile({ ...profile, defaultYearGroup: e.target.value })}
                style={SELECT_STYLE}
              >
                {YEAR_GROUPS.map((yg) => (
                  <option key={yg} value={yg}>{yg}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.4rem", display: "block" }}>
                Subject
              </label>
              <select
                value={profile.defaultSubject}
                onChange={(e) => setProfile({ ...profile, defaultSubject: e.target.value })}
                style={SELECT_STYLE}
              >
                {SUBJECT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Teaching Tone ── */}
        <div className="card">
          <SectionLabel>Teaching Tone</SectionLabel>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Controls the language style used in explanations and activities.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {TONE_OPTIONS.map((opt) => {
              const active = profile.tone === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile({ ...profile, tone: opt.value })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: active ? "rgb(var(--accent-rgb) / 0.07)" : "var(--field-bg)",
                    cursor: "pointer",
                    textAlign: "left" as const,
                    fontFamily: "inherit",
                    transition: "border-color 160ms ease, background 160ms ease",
                  }}
                >
                  <span style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: active ? "5px solid var(--accent)" : "2px solid var(--border)",
                    flexShrink: 0,
                    transition: "border 160ms ease",
                    background: "transparent",
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: active ? "var(--accent)" : "var(--text)" }}>
                      {opt.label}
                    </p>
                    <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── School Type ── */}
        <div className="card">
          <SectionLabel>School Type</SectionLabel>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Tailors content to your school's context and pupil needs.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {SCHOOL_TYPE_OPTIONS.map((opt) => {
              const active = profile.schoolType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile({ ...profile, schoolType: opt.value })}
                  style={{
                    padding: "0.5rem 1.15rem",
                    borderRadius: "999px",
                    border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: active ? "rgb(var(--accent-rgb) / 0.1)" : "var(--field-bg)",
                    color: active ? "var(--accent)" : "var(--text)",
                    fontSize: "0.84rem",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 160ms ease",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <SectionLabel>Preferences</SectionLabel>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
              Fine-tune generation behaviour for your workflow.
            </p>
          </div>

          <Toggle
            checked={profile.sendFocus}
            onChange={(v) => setProfile({ ...profile, sendFocus: v })}
            label="Default SEND adaptations"
            desc="Always include SEND-specific strategies in generated lesson packs."
          />

          <div style={{ height: "1px", background: "var(--border)" }} />

          <Toggle
            checked={profile.autoSave}
            onChange={(v) => setProfile({ ...profile, autoSave: v })}
            label="Auto-save to library"
            desc="Automatically save each generated lesson pack to your library."
          />
        </div>

        {/* ── Save button ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="submit"
            disabled={isSaving}
            className="nav-btn-cta"
            style={{
              padding: "0.8rem 2rem",
              fontSize: "0.9rem",
              borderRadius: "12px",
              opacity: isSaving ? 0.7 : 1,
              gap: "0.55rem",
            }}
          >
            {isSaving ? (
              <>
                <span style={{
                  width: "13px",
                  height: "13px",
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.65s linear infinite",
                  flexShrink: 0,
                }} />
                Saving…
              </>
            ) : "Save Settings"}
          </button>

          {status === "saved" && (
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#4ade80" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
              </svg>
              Settings saved
            </span>
          )}

          {status === "error" && (
            <span style={{ fontSize: "0.85rem", color: "#fc8181" }}>{errorMsg}</span>
          )}
        </div>

      </form>
    </main>
  );
}
