"use client";

import { type ChangeEvent, type ReactNode, useEffect, useId, useState } from "react";
import { compressDataUrl, fileToOptimisedDataUrl } from "@/lib/client/avatar-upload";

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

function SaveBar({ onSave, status, error }: { onSave: () => void; status: "idle"|"saving"|"saved"|"error"; error?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={onSave}
        disabled={status === "saving"}
        className="nav-btn-cta"
        style={{ padding: "0.48rem 1.2rem", fontSize: "0.84rem", borderRadius: "9px", opacity: status === "saving" ? 0.7 : 1, gap: "0.45rem" }}
      >
        {status === "saving" ? (
          <>
            <span style={{ width: "11px", height: "11px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.65s linear infinite", flexShrink: 0 }} />
            Saving…
          </>
        ) : "Save"}
      </button>
      {status === "saved" && (
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#4ade80" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" /></svg>
          Saved
        </span>
      )}
      {status === "error" && (
        <span style={{ fontSize: "0.82rem", color: "#fc8181" }}>{error || "Save failed"}</span>
      )}
    </div>
  );
}

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
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  type SectionKey = "profile" | "defaults" | "terms" | "tone" | "schoolType" | "approach" | "ability" | "classProfile" | "classNotes" | "prefs";
  const SECTION_KEYS: SectionKey[] = ["profile","defaults","terms","tone","schoolType","approach","ability","classProfile","classNotes","prefs"];
  const blankRecord = <T,>(v: T) => Object.fromEntries(SECTION_KEYS.map(k => [k, v])) as Record<SectionKey, T>;
  const [sectionStatus, setSectionStatus] = useState(() => blankRecord<"idle"|"saving"|"saved"|"error">("idle"));
  const [sectionErrors, setSectionErrors] = useState(() => blankRecord(""));
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
      setSectionErrors(prev => ({ ...prev, profile: "Could not process that image. Please try a different file." }));
      setSectionStatus(prev => ({ ...prev, profile: "error" }));
    }
  }

  async function handleGenerateAIAvatar() {
    if (!profile.displayName.trim() && !avatarPrompt.trim()) {
      setSectionErrors(prev => ({ ...prev, profile: "Enter your name or a description first." }));
      setSectionStatus(prev => ({ ...prev, profile: "error" }));
      return;
    }
    setSectionErrors(prev => ({ ...prev, profile: "" }));
    setAiGenerating(true);
    try {
      const res = await fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.displayName.trim(), description: avatarPrompt.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.dataUrl) {
        throw new Error(data?.error || "Image generation failed. Please try again.");
      }
      const compressed = await compressDataUrl(data.dataUrl);
      setProfile((prev) => ({ ...prev, avatarUrl: compressed }));
      setAvatarFileName("AI generated avatar");
    } catch (err) {
      setSectionErrors(prev => ({ ...prev, profile: err instanceof Error ? err.message : "Image generation failed. Please try again." }));
      setSectionStatus(prev => ({ ...prev, profile: "error" }));
    } finally {
      setAiGenerating(false);
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

  async function saveSection(key: SectionKey, calls: Array<() => Promise<Response>>) {
    setSectionStatus(prev => ({ ...prev, [key]: "saving" }));
    setSectionErrors(prev => ({ ...prev, [key]: "" }));
    try {
      const results = await Promise.all(calls.map(fn => fn()));
      const failed = results.find(r => !r.ok);
      if (!failed) {
        setSectionStatus(prev => ({ ...prev, [key]: "saved" }));
        setTimeout(() => setSectionStatus(prev => prev[key] === "saved" ? { ...prev, [key]: "idle" } : prev), 3000);
      } else {
        const data = await failed.json().catch(() => ({}));
        setSectionStatus(prev => ({ ...prev, [key]: "error" }));
        setSectionErrors(prev => ({ ...prev, [key]: data?.error ?? "Save failed. Please try again." }));
      }
    } catch {
      setSectionStatus(prev => ({ ...prev, [key]: "error" }));
      setSectionErrors(prev => ({ ...prev, [key]: "Network error. Please try again." }));
    }
  }

  const postProfile = () => fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, ealPercent: toPayloadPercent(profile.ealPercent), pupilPremiumPercent: toPayloadPercent(profile.pupilPremiumPercent), aboveStandardPercent: toPayloadPercent(profile.aboveStandardPercent), belowStandardPercent: toPayloadPercent(profile.belowStandardPercent), hugelyAboveStandardPercent: toPayloadPercent(profile.hugelyAboveStandardPercent), hugelyBelowStandardPercent: toPayloadPercent(profile.hugelyBelowStandardPercent) }) });
  const postSetup = () => fetch("/api/profile/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: profile.displayName, avatarUrl: profile.avatarUrl }) });
  const postTerms = () => fetch("/api/profile/terms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ terms }) });

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

      <form style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

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
              <label style={FIELD_LABEL_STYLE}>
                Avatar description (optional)
              </label>
              <input
                value={avatarPrompt}
                onChange={(e) => setAvatarPrompt(e.target.value)}
                placeholder="e.g. woman with short curly red hair, glasses, blue cardigan — or leave blank to use your name"
              />
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
                Be specific about appearance: hair colour &amp; style, skin tone, clothing, age, accessories. The more detail, the better the match.
              </p>
            </div>

            <div>
              <label style={FIELD_LABEL_STYLE}>
                Or upload / generate a photo
              </label>

              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                <div className="field" style={{ margin: 0 }}>
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
                </div>

                <span className="muted" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>or</span>

                <button
                  type="button"
                  onClick={handleGenerateAIAvatar}
                  disabled={aiGenerating}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.45rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "999px",
                    border: "1.5px solid var(--accent)",
                    background: "rgb(var(--accent-rgb) / 0.08)",
                    color: "var(--accent)",
                    fontSize: "0.84rem", fontWeight: 600,
                    cursor: aiGenerating ? "wait" : "pointer",
                    fontFamily: "inherit",
                    transition: "opacity 150ms ease",
                    opacity: aiGenerating ? 0.7 : 1,
                  }}
                >
                  {aiGenerating ? (
                    <>
                      <span style={{ width: "12px", height: "12px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.65s linear infinite" }} />
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M8 0a.75.75 0 0 1 .712.513l1.33 3.986 3.987 1.33a.75.75 0 0 1 0 1.422l-3.986 1.33-1.33 3.987a.75.75 0 0 1-1.422 0L5.96 8.58 1.975 7.25a.75.75 0 0 1 0-1.422L5.96 4.498 7.29.512A.75.75 0 0 1 8 0zm0 2.988L7.07 5.73a.75.75 0 0 1-.47.47L3.86 7.13l2.74.93a.75.75 0 0 1 .47.47L8 11.27l.93-2.74a.75.75 0 0 1 .47-.47l2.74-.93-2.74-.93a.75.75 0 0 1-.47-.47L8 2.988z" />
                      </svg>
                      Create with AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Profile preview"
                style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
              />
            ) : null}
          </div>
          <SaveBar onSave={() => saveSection("profile", [postSetup])} status={sectionStatus.profile} error={sectionErrors.profile} />
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
          <SaveBar onSave={() => saveSection("defaults", [postProfile])} status={sectionStatus.defaults} error={sectionErrors.defaults} />
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
          <SaveBar onSave={() => saveSection("terms", [postTerms])} status={sectionStatus.terms} error={sectionErrors.terms} />
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
          <SaveBar onSave={() => saveSection("tone", [postProfile])} status={sectionStatus.tone} error={sectionErrors.tone} />
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
          <SaveBar onSave={() => saveSection("schoolType", [postProfile])} status={sectionStatus.schoolType} error={sectionErrors.schoolType} />
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
          <SaveBar onSave={() => saveSection("approach", [postProfile])} status={sectionStatus.approach} error={sectionErrors.approach} />
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
          <SaveBar onSave={() => saveSection("ability", [postProfile])} status={sectionStatus.ability} error={sectionErrors.ability} />
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
          <SaveBar onSave={() => saveSection("classProfile", [postProfile])} status={sectionStatus.classProfile} error={sectionErrors.classProfile} />
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
          <SaveBar onSave={() => saveSection("classNotes", [postProfile])} status={sectionStatus.classNotes} error={sectionErrors.classNotes} />
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
          <SaveBar onSave={() => saveSection("prefs", [postProfile])} status={sectionStatus.prefs} error={sectionErrors.prefs} />
        </div>

        <DangerZone />

      </form>
    </main>
  );
}

// ── Danger Zone ────────────────────────────────────────────────────────────────

function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string })?.error ?? "Could not delete account. Please try again.");
        setDeleting(false);
        return;
      }
      // Account deleted — redirect to home
      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="card" style={{ border: "1px solid rgb(239 68 68 / 0.35)", background: "rgb(239 68 68 / 0.03)" }}>
        <h2 style={{ margin: "0 0 0.3rem", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ef4444" }}>
          Danger Zone
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => { setOpen(true); setConfirm(""); setError(""); }}
          style={{
            padding: "0.5rem 1.1rem",
            borderRadius: "9px",
            border: "1.5px solid #ef4444",
            background: "transparent",
            color: "#ef4444",
            fontSize: "0.84rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 160ms ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgb(239 68 68 / 0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          Delete my account
        </button>
      </div>

      {/* Confirmation modal */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setOpen(false); }}
        >
          <div className="card" style={{ maxWidth: 440, width: "100%", margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="#ef4444" aria-hidden="true">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 6.5a.875.875 0 1 1 0-1.75A.875.875 0 0 1 8 11z" />
              </svg>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ef4444" }}>
                Delete account
              </h2>
            </div>

            <p style={{ margin: "0 0 0.5rem", fontSize: "0.87rem", color: "var(--text)", lineHeight: 1.55 }}>
              This will <strong>permanently delete</strong> your account, profile, lesson library, and all saved data. There is no way to recover it.
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.87rem", color: "var(--text)" }}>
              Type <strong>DELETE</strong> to confirm:
            </p>

            <div className="field" style={{ marginBottom: "1rem" }}>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                disabled={deleting}
                style={{ fontFamily: "inherit" }}
                autoFocus
              />
            </div>

            {error && (
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "#fc8181" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirm !== "DELETE" || deleting}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.45rem",
                  padding: "0.5rem 1.1rem", borderRadius: "9px",
                  border: "none",
                  background: confirm === "DELETE" && !deleting ? "#ef4444" : "rgb(239 68 68 / 0.35)",
                  color: "white",
                  fontSize: "0.84rem", fontWeight: 600,
                  cursor: confirm === "DELETE" && !deleting ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  transition: "background 160ms ease",
                }}
              >
                {deleting && (
                  <span style={{ width: "12px", height: "12px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.65s linear infinite" }} />
                )}
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
