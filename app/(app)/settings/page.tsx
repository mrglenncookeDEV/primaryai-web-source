"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useId, useState } from "react";
import { fileToOptimisedDataUrl } from "@/lib/client/avatar-upload";

type Profile = {
  displayName: string;
  avatarUrl: string;
  defaultYearGroup: string;
  defaultSubject: string;
  tone: string;
  schoolType: string;
  sendFocus: boolean;
  autoSave: boolean;
  classNotes: string;
  teachingApproach: string;
  abilityMix: string;
  ealPercent: number | "";
  pupilPremiumPercent: number | "";
  aboveStandardPercent: number | "";
  belowStandardPercent: number | "";
  hugelyAboveStandardPercent: number | "";
  hugelyBelowStandardPercent: number | "";
};

type TermEntry = {
  id: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
};

const INITIAL_PROFILE: Profile = {
  displayName: "",
  avatarUrl: "",
  defaultYearGroup: "Year 4",
  defaultSubject: "Maths",
  tone: "professional_uk",
  schoolType: "primary",
  sendFocus: false,
  autoSave: false,
  classNotes: "",
  teachingApproach: "cpa",
  abilityMix: "mixed",
  ealPercent: "",
  pupilPremiumPercent: "",
  aboveStandardPercent: "",
  belowStandardPercent: "",
  hugelyAboveStandardPercent: "",
  hugelyBelowStandardPercent: "",
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

const TEACHING_APPROACH_OPTIONS = [
  { value: "cpa", label: "Concrete-Pictorial-Abstract", desc: "Physical resources and diagrams before abstract notation — recommended for Maths" },
  { value: "direct_instruction", label: "Direct Instruction", desc: "Teacher models each step clearly before pupils practise independently" },
  { value: "problem_solving", label: "Problem-Solving Led", desc: "Start with a rich problem; pupils reason their way to the concept" },
  { value: "inquiry", label: "Inquiry-Based", desc: "Pupils investigate, question and build their own generalisations" },
];

const ABILITY_MIX_OPTIONS = [
  { value: "mixed", label: "Mixed ability", desc: "Wide range of attainment — clear scaffolding and stretch across all tasks" },
  { value: "predominantly_lower", label: "Predominantly lower ability", desc: "More scaffolding, smaller steps, accessible language throughout" },
  { value: "predominantly_higher", label: "Predominantly higher ability", desc: "Raised baseline; greater depth task pushes the most able significantly" },
];
const MIN_CLASS_NOTES_CHARS = 200;

function toInputPercent(value: unknown): number | "" {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : "";
}

function toPayloadPercent(value: number | ""): number | null {
  return value === "" ? null : value;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: "0.4rem",
  lineHeight: 1.35,
  minHeight: "1.35em",
  display: "block",
};

const FIELD_LABEL_STYLE_TALL: React.CSSProperties = {
  ...FIELD_LABEL_STYLE,
  minHeight: "2.4em",
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const uploadInputId = useId();

  useEffect(() => {
    void (async () => {
      const [res, termsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/profile/terms"),
      ]);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.profile) {
        setProfile({
          displayName: "",
          avatarUrl: "",
          defaultYearGroup: data.profile.defaultYearGroup ?? INITIAL_PROFILE.defaultYearGroup,
          defaultSubject: data.profile.defaultSubject ?? INITIAL_PROFILE.defaultSubject,
          tone: data.profile.tone ?? INITIAL_PROFILE.tone,
          schoolType: data.profile.schoolType ?? INITIAL_PROFILE.schoolType,
          sendFocus: Boolean(data.profile.sendFocus),
          autoSave: Boolean(data.profile.autoSave),
          classNotes: data.profile.classNotes ?? INITIAL_PROFILE.classNotes,
          teachingApproach: data.profile.teachingApproach ?? INITIAL_PROFILE.teachingApproach,
          abilityMix: data.profile.abilityMix ?? INITIAL_PROFILE.abilityMix,
          ealPercent: toInputPercent(data.profile.ealPercent),
          pupilPremiumPercent: toInputPercent(data.profile.pupilPremiumPercent),
          aboveStandardPercent: toInputPercent(data.profile.aboveStandardPercent),
          belowStandardPercent: toInputPercent(data.profile.belowStandardPercent),
          hugelyAboveStandardPercent: toInputPercent(data.profile.hugelyAboveStandardPercent),
          hugelyBelowStandardPercent: toInputPercent(data.profile.hugelyBelowStandardPercent),
        });
      }

      const termsData = await termsRes.json().catch(() => ({}));
      if (termsRes.ok && Array.isArray(termsData?.terms)) {
        setTerms(termsData.terms.map((term: any, index: number) => ({
          id: String(term?.id || `term-${index}`),
          termName: String(term?.termName || ""),
          termStartDate: String(term?.termStartDate || ""),
          termEndDate: String(term?.termEndDate || ""),
        })));
      }

      const setupRes = await fetch("/api/profile/setup");
      const setupData = await setupRes.json().catch(() => ({}));
      if (setupRes.ok && setupData?.profileSetup) {
        setProfile((prev) => ({
          ...prev,
          displayName: setupData.profileSetup.displayName ?? "",
          avatarUrl: setupData.profileSetup.avatarUrl ?? "",
        }));
      }
    })();
  }, []);

  async function onAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFileName(file.name);
    try {
      const value = await fileToOptimisedDataUrl(file, 320, 0.82);
      setProfile((prev) => ({ ...prev, avatarUrl: value }));
    } catch {
      setErrorMsg("Could not process that image. Please try a different file.");
      setStatus("error");
    }
  }

  function updatePercentField<K extends keyof Pick<Profile,
    "ealPercent" | "pupilPremiumPercent" | "aboveStandardPercent" | "belowStandardPercent" | "hugelyAboveStandardPercent" | "hugelyBelowStandardPercent"
  >>(key: K, value: string) {
    if (value.trim() === "") {
      setProfile((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
    setProfile((prev) => ({ ...prev, [key]: clamped }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");

    const payload = {
      ...profile,
      ealPercent: toPayloadPercent(profile.ealPercent),
      pupilPremiumPercent: toPayloadPercent(profile.pupilPremiumPercent),
      aboveStandardPercent: toPayloadPercent(profile.aboveStandardPercent),
      belowStandardPercent: toPayloadPercent(profile.belowStandardPercent),
      hugelyAboveStandardPercent: toPayloadPercent(profile.hugelyAboveStandardPercent),
      hugelyBelowStandardPercent: toPayloadPercent(profile.hugelyBelowStandardPercent),
    };

    const [res, setupRes, termsRes] = await Promise.all([
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      fetch("/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: profile.displayName, avatarUrl: profile.avatarUrl }),
      }),
      fetch("/api/profile/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms }),
      }),
    ]);

    if (res.ok && setupRes.ok && termsRes.ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      const data = await (!res.ok ? res : !setupRes.ok ? setupRes : termsRes).json().catch(() => ({}));
      setStatus("error");
      setErrorMsg(data?.error ?? "Save failed. Please try again.");
    }
  }

  function termStatus(term: TermEntry) {
    if (!term.termStartDate || !term.termEndDate) return "Inactive";
    const todayIso = toISODate(new Date());
    return todayIso >= term.termStartDate && todayIso <= term.termEndDate ? "Active" : "Inactive";
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

  const isSaving = status === "saving";
  const classNotesLength = profile.classNotes.trim().length;
  const classNotesRemaining = Math.max(0, MIN_CLASS_NOTES_CHARS - classNotesLength);
  const attainmentTotal =
    (profile.aboveStandardPercent || 0) +
    (profile.belowStandardPercent || 0) +
    (profile.hugelyAboveStandardPercent || 0) +
    (profile.hugelyBelowStandardPercent || 0);

  return (
    <main className="page-wrap">

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
          Personalise how PrimaryAI generates content for your class.
        </p>
      </div>

      <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Profile ── */}
        <div className="card">
          <SectionLabel>Profile</SectionLabel>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Set your display name and profile photo.
          </p>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <div className="field">
              <label style={FIELD_LABEL_STYLE}>
                Display Name
              </label>
              <input
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div className="field">
              <label style={FIELD_LABEL_STYLE}>
                Photo URL
              </label>
              <input
                value={profile.avatarUrl}
                onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="field">
              <input
                id={uploadInputId}
                className="file-upload-input"
                type="file"
                accept="image/*"
                onChange={onAvatarUpload}
              />
              <label htmlFor={uploadInputId} className="landing-thoughts-btn file-upload-cta">
                Upload Photo
              </label>
              <span className="muted" style={{ fontSize: "0.78rem", marginTop: "0.45rem", display: "block" }}>
                {avatarFileName || "No file selected"}
              </span>
            </div>

            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Profile preview"
                style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
              />
            ) : null}
          </div>
        </div>

        {/* ── Defaults ── */}
        <div className="card">
          <SectionLabel>Defaults</SectionLabel>
          <p style={{ margin: "0 0 1.1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Pre-fill the lesson pack form with your typical class.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
            <div className="field">
              <label style={FIELD_LABEL_STYLE}>
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
              <label style={FIELD_LABEL_STYLE}>
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

        <div className="card">
          <SectionLabel>Terms</SectionLabel>
          <p style={{ margin: "0 0 1.1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Add your current and future terms so planning can work across the school year.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {terms.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                No terms added yet.
              </p>
            ) : (
              terms.map((term, index) => {
                const status = termStatus(term);
                return (
                  <div key={term.id} style={{ border: "1px solid var(--border)", borderRadius: "14px", padding: "0.95rem", background: "var(--field-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>
                        Term {index + 1}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.28rem 0.7rem",
                          borderRadius: "999px",
                          background: status === "Active" ? "rgb(16 185 129 / 0.12)" : "rgb(148 163 184 / 0.14)",
                          color: status === "Active" ? "#10b981" : "var(--muted)",
                          border: `1px solid ${status === "Active" ? "rgb(16 185 129 / 0.35)" : "var(--border)"}`,
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                        }}>
                          {status}
                        </span>
                        <button type="button" className="button secondary" onClick={() => removeTerm(term.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
                      <div className="field">
                        <label style={FIELD_LABEL_STYLE}>Term Name</label>
                        <input
                          value={term.termName}
                          onChange={(e) => updateTerm(term.id, { termName: e.target.value })}
                          placeholder="e.g. Spring 1"
                        />
                      </div>
                      <div className="field">
                        <label style={FIELD_LABEL_STYLE}>Start Date</label>
                        <input
                          type="date"
                          value={term.termStartDate}
                          onChange={(e) => updateTerm(term.id, { termStartDate: e.target.value })}
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="field">
                        <label style={FIELD_LABEL_STYLE}>End Date</label>
                        <input
                          type="date"
                          value={term.termEndDate}
                          onChange={(e) => updateTerm(term.id, { termEndDate: e.target.value })}
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div>
              <button type="button" className="button secondary" onClick={addEmptyTerm}>
                Add Term
              </button>
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

        {/* ── Teaching Approach ── */}
        <div className="card">
          <SectionLabel>Teaching Approach</SectionLabel>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Shapes how activities and worked examples are structured and presented.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {TEACHING_APPROACH_OPTIONS.map((opt) => {
              const active = profile.teachingApproach === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile({ ...profile, teachingApproach: opt.value })}
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

        {/* ── Ability Mix ── */}
        <div className="card">
          <SectionLabel>Class Ability Mix</SectionLabel>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Adjusts how differentiation is pitched across support, expected and greater depth tasks.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {ABILITY_MIX_OPTIONS.map((opt) => {
              const active = profile.abilityMix === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile({ ...profile, abilityMix: opt.value })}
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

        {/* ── About My Class ── */}
        <div className="card">
          <SectionLabel>Class Profile Percentages</SectionLabel>
          <p style={{ margin: "0 0 0.9rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            These are required before lesson pack generation. Enter whole-number percentages from 0 to 100.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            <div className="field">
              <label style={FIELD_LABEL_STYLE_TALL}>% class EAL (English as second language)</label>
              <input type="number" min={0} max={100} step={1} value={profile.ealPercent} onChange={(e) => updatePercentField("ealPercent", e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label style={FIELD_LABEL_STYLE_TALL}>% class on pupil premium (vocabulary prompts)</label>
              <input type="number" min={0} max={100} step={1} value={profile.pupilPremiumPercent} onChange={(e) => updatePercentField("pupilPremiumPercent", e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label style={FIELD_LABEL_STYLE_TALL}>% class generally above standard</label>
              <input type="number" min={0} max={100} step={1} value={profile.aboveStandardPercent} onChange={(e) => updatePercentField("aboveStandardPercent", e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label style={FIELD_LABEL_STYLE_TALL}>% class generally below standard</label>
              <input type="number" min={0} max={100} step={1} value={profile.belowStandardPercent} onChange={(e) => updatePercentField("belowStandardPercent", e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label style={FIELD_LABEL_STYLE_TALL}>% class hugely above standard</label>
              <input type="number" min={0} max={100} step={1} value={profile.hugelyAboveStandardPercent} onChange={(e) => updatePercentField("hugelyAboveStandardPercent", e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label style={FIELD_LABEL_STYLE_TALL}>% class hugely below standard</label>
              <input type="number" min={0} max={100} step={1} value={profile.hugelyBelowStandardPercent} onChange={(e) => updatePercentField("hugelyBelowStandardPercent", e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: attainmentTotal > 100 ? "#fc8181" : "var(--muted)" }}>
            Combined attainment bands (above/below/hugely above/hugely below): {attainmentTotal}% {attainmentTotal > 100 ? "— must be 100% or less" : ""}
          </p>
        </div>

        {/* ── About My Class ── */}
        <div className="card">
          <SectionLabel>About My Class</SectionLabel>
          <p style={{ margin: "0 0 0.9rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            Tell the AI anything specific about your class — scheme of work, EAL learners, TA support, grouping, or anything else that should shape the content.
            This must be at least 200 characters before lesson packs can be generated.
          </p>
          <textarea
            value={profile.classNotes}
            onChange={(e) => setProfile({ ...profile, classNotes: e.target.value })}
            placeholder="e.g. We follow White Rose Maths. 6 EAL learners at early fluency. A TA supports a lower group of 8. Many pupils find word problems difficult."
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box" as const,
              resize: "vertical" as const,
              border: "1px solid var(--border)",
              background: "var(--field-bg)",
              color: "var(--text)",
              borderRadius: "10px",
              padding: "0.65rem 0.75rem",
              fontSize: "0.87rem",
              fontFamily: "inherit",
              lineHeight: 1.6,
              outline: "none",
            }}
          />
          <p style={{
            margin: "0.55rem 0 0",
            fontSize: "0.78rem",
            color: classNotesRemaining === 0 ? "#4ade80" : "var(--muted)",
          }}>
            Minimum {MIN_CLASS_NOTES_CHARS} characters required.
            {" "}
            {classNotesLength} entered
            {classNotesRemaining > 0 ? ` (${classNotesRemaining} more needed)` : " (requirement met)"}
          </p>
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
