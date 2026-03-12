"use client";

import { type ChangeEvent, useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { compressDataUrl, fileToOptimisedDataUrl } from "@/lib/client/avatar-upload";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Constants ──────────────────────────────────────────────────────────────────

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

const STEPS = [
  { label: "Profile",          subtitle: "Set your name and photo so your workspace feels personal." },
  { label: "Defaults & Terms", subtitle: "Choose year group, subject and enter your school term dates." },
  { label: "Tone & School",    subtitle: "Set the AI's language style and your school type." },
  { label: "Teaching",         subtitle: "Tell the AI how you teach so content fits your approach." },
  { label: "Class Details",    subtitle: "Describe your class so the AI can pitch content correctly." },
  { label: "Preferences",      subtitle: "Fine-tune how PrimaryAI behaves in your workflow." },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function isSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toInputPercent(value: unknown): number | "" {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : "";
}

function toPayloadPercent(value: number | ""): number | null {
  return value === "" ? null : value;
}

// ── Shared style constants ─────────────────────────────────────────────────────

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
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: "0.4rem",
  display: "block",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function RadioCard({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        padding: "0.75rem 1rem",
        borderRadius: "12px",
        border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
        background: active ? "rgb(var(--accent-rgb) / 0.07)" : "var(--field-bg)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        width: "100%",
        transition: "border-color 160ms ease, background 160ms ease",
      }}
    >
      <span style={{
        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
        border: active ? "5px solid var(--accent)" : "2px solid var(--border)",
        transition: "border 160ms ease",
        background: "transparent",
      }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: active ? "var(--accent)" : "var(--text)" }}>
          {label}
        </p>
        {desc && (
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.4 }}>{desc}</p>
        )}
      </div>
    </button>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", cursor: "pointer", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--field-bg)" }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>{label}</p>
        {desc && <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.45 }}>{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        style={{
          flexShrink: 0, width: "44px", height: "24px", borderRadius: "999px",
          border: "none", padding: "2px", cursor: "pointer",
          background: checked ? "var(--accent)" : "var(--border)",
          transition: "background 200ms ease",
          display: "flex", alignItems: "center",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "white", display: "block", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "2rem" }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.78rem", fontWeight: 700,
              background: done || active ? "var(--accent)" : "transparent",
              border: done || active ? "none" : "2px solid var(--border)",
              color: done || active ? "var(--accent-text)" : "var(--muted)",
              transition: "background 250ms ease, border-color 250ms ease",
            }}>
              {done ? (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            {i < total - 1 && (
              <div style={{
                width: "clamp(20px, 6vw, 48px)", height: "2px",
                background: i < current ? "var(--accent)" : "var(--border)",
                transition: "background 250ms ease",
                flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Confetti burst ─────────────────────────────────────────────────────────────

function ConfettiBurst() {
  useEffect(() => {
    if (!document.getElementById("confetti-keyframes")) {
      const style = document.createElement("style");
      style.id = "confetti-keyframes";
      style.textContent = `
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const colors = ["#4f46e5", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#f59e0b", "#ec4899"];
    const particles: HTMLElement[] = [];

    for (let i = 0; i < 130; i++) {
      const el = document.createElement("div");
      const size = Math.random() * 9 + 4;
      const isRect = Math.random() > 0.45;
      el.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${isRect ? size * 2.2 : size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${isRect ? "2px" : "50%"};
        top: -20px;
        left: ${Math.random() * 100}vw;
        z-index: 9999;
        pointer-events: none;
        animation: confetti-fall ${Math.random() * 2.5 + 2.5}s ease-in ${Math.random() * 1.8}s forwards;
      `;
      document.body.appendChild(el);
      particles.push(el);
    }

    const cleanup = setTimeout(() => particles.forEach((p) => p.remove()), 6500);
    return () => {
      clearTimeout(cleanup);
      particles.forEach((p) => p.remove());
    };
  }, []);

  return null;
}

// ── Confirmation screen ────────────────────────────────────────────────────────

function ConfirmationScreen({ onGo }: { onGo: () => void }) {
  return (
    <main className="page-wrap">
      <ConfettiBurst />
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", paddingTop: "clamp(2rem, 8vh, 5rem)" }}>
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: "rgb(var(--accent-rgb) / 0.12)",
          border: "3px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem",
          fontSize: "2.6rem",
        }}>
          ✓
        </div>

        <h1 style={{ margin: "0 0 0.6rem", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em" }}>
          You&apos;re all set!
        </h1>
        <p style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.55 }}>
          Your workspace is ready. PrimaryAI now knows how you teach and can generate lesson packs tailored to you and your class.
        </p>
        <p style={{ margin: "0 0 2.25rem", fontSize: "0.88rem", color: "var(--muted)" }}>
          All of these settings can be changed at any time in the <strong>Settings</strong> menu.
        </p>

        <button
          type="button"
          className="nav-btn-cta"
          onClick={onGo}
          style={{ justifyContent: "center", fontSize: "1rem", padding: "0.85rem 2.5rem" }}
        >
          Go to your dashboard →
        </button>
      </div>
    </main>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const uploadInputId = useId();

  const nextPath = useMemo(() => {
    const raw = String(searchParams?.get("next") || "/dashboard");
    return isSafeNextPath(raw) ? raw : "/dashboard";
  }, [searchParams]);

  // Load existing data
  useEffect(() => {
    void (async () => {
      const [setupRes, profileRes, termsRes] = await Promise.all([
        fetch("/api/profile/setup"),
        fetch("/api/profile"),
        fetch("/api/profile/terms"),
      ]);

      const setupData = await setupRes.json().catch(() => ({}));
      const profileData = await profileRes.json().catch(() => ({}));
      const termsData = await termsRes.json().catch(() => ({}));

      setProfile((prev) => ({
        ...prev,
        displayName: setupData?.profileSetup?.displayName ?? prev.displayName,
        avatarUrl: setupData?.profileSetup?.avatarUrl ?? prev.avatarUrl,
        ...(profileData?.profile ? {
          defaultYearGroup: profileData.profile.defaultYearGroup ?? prev.defaultYearGroup,
          defaultSubject: profileData.profile.defaultSubject ?? prev.defaultSubject,
          tone: profileData.profile.tone ?? prev.tone,
          schoolType: profileData.profile.schoolType ?? prev.schoolType,
          sendFocus: Boolean(profileData.profile.sendFocus),
          autoSave: Boolean(profileData.profile.autoSave),
          classNotes: profileData.profile.classNotes ?? prev.classNotes,
          teachingApproach: profileData.profile.teachingApproach ?? prev.teachingApproach,
          abilityMix: profileData.profile.abilityMix ?? prev.abilityMix,
          ealPercent: toInputPercent(profileData.profile.ealPercent),
          pupilPremiumPercent: toInputPercent(profileData.profile.pupilPremiumPercent),
          aboveStandardPercent: toInputPercent(profileData.profile.aboveStandardPercent),
          belowStandardPercent: toInputPercent(profileData.profile.belowStandardPercent),
          hugelyAboveStandardPercent: toInputPercent(profileData.profile.hugelyAboveStandardPercent),
          hugelyBelowStandardPercent: toInputPercent(profileData.profile.hugelyBelowStandardPercent),
        } : {}),
      }));

      if (termsRes.ok && Array.isArray(termsData?.terms)) {
        setTerms(termsData.terms.map((t: Record<string, unknown>, i: number) => ({
          id: String(t?.id || `term-${i}`),
          termName: String(t?.termName || ""),
          termStartDate: String(t?.termStartDate || ""),
          termEndDate: String(t?.termEndDate || ""),
        })));
      }
    })();
  }, []);

  async function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFileName(file.name);
    try {
      const value = await fileToOptimisedDataUrl(file, 320, 0.82);
      setProfile((prev) => ({ ...prev, avatarUrl: value }));
    } catch {
      setError("Could not process that image. Please try a different file.");
    }
  }

  async function handleGenerateAIAvatar() {
    if (!profile.displayName.trim() && !avatarPrompt.trim()) {
      setError("Enter your name or a description first.");
      return;
    }
    setError("");
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
      setError(err instanceof Error ? err.message : "Image generation failed. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  }

  function updatePercentField(key: keyof Profile, value: string) {
    if (value.trim() === "") { setProfile((p) => ({ ...p, [key]: "" })); return; }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setProfile((p) => ({ ...p, [key]: Math.max(0, Math.min(100, Math.round(parsed))) }));
  }

  function addEmptyTerm() {
    setTerms((prev) => [...prev, { id: `term-${Date.now()}-${prev.length}`, termName: "", termStartDate: "", termEndDate: "" }]);
  }

  function updateTerm(id: string, patch: Partial<TermEntry>) {
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTerm(id: string) {
    setTerms((prev) => prev.filter((t) => t.id !== id));
  }

  function termIsActive(term: TermEntry) {
    if (!term.termStartDate || !term.termEndDate) return false;
    const today = toISODate(new Date());
    return today >= term.termStartDate && today <= term.termEndDate;
  }

  const profilePayload = {
    defaultYearGroup: profile.defaultYearGroup,
    defaultSubject: profile.defaultSubject,
    tone: profile.tone,
    schoolType: profile.schoolType,
    sendFocus: profile.sendFocus,
    autoSave: profile.autoSave,
    classNotes: profile.classNotes,
    teachingApproach: profile.teachingApproach,
    abilityMix: profile.abilityMix,
    ealPercent: toPayloadPercent(profile.ealPercent),
    pupilPremiumPercent: toPayloadPercent(profile.pupilPremiumPercent),
    aboveStandardPercent: toPayloadPercent(profile.aboveStandardPercent),
    belowStandardPercent: toPayloadPercent(profile.belowStandardPercent),
    hugelyAboveStandardPercent: toPayloadPercent(profile.hugelyAboveStandardPercent),
    hugelyBelowStandardPercent: toPayloadPercent(profile.hugelyBelowStandardPercent),
  };

  async function saveStep(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const completingSetup = step === STEPS.length - 1;
      const calls: Promise<Response>[] = [
        fetch("/api/profile/setup", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            profileCompleted: completingSetup,
          }),
        }),
        fetch("/api/profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        }),
        fetch("/api/profile/terms", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms }),
        }),
      ];
      const results = await Promise.all(calls);
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const data = await failed.json().catch(() => ({}));
        setError((data as { error?: string })?.error ?? "Could not save. Please try again.");
        setSaving(false);
        return false;
      }
      setSaving(false);
      return true;
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
      return false;
    }
  }

  async function handleNext() {
    if (step === 0 && !profile.displayName.trim()) {
      setError("Please enter your name before continuing.");
      return;
    }
    const ok = await saveStep();
    if (!ok) return;
    if (step === STEPS.length - 1) {
      setDone(true);
    } else {
      setStep((s) => s + 1);
      setError("");
    }
  }

  function handleBack() {
    if (step > 0) { setStep((s) => s - 1); setError(""); }
  }

  // ── Celebration screen ───────────────────────────────────────────────────────

  if (done) {
    return (
      <ConfirmationScreen onGo={() => { router.push(nextPath); router.refresh(); }} />
    );
  }

  const classNotesLength = profile.classNotes.trim().length;
  const classNotesRemaining = Math.max(0, MIN_CLASS_NOTES_CHARS - classNotesLength);
  const attainmentTotal =
    (profile.aboveStandardPercent || 0) + (profile.belowStandardPercent || 0) +
    (profile.hugelyAboveStandardPercent || 0) + (profile.hugelyBelowStandardPercent || 0);

  const currentStepInfo = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <main className="page-wrap">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
            Set up your workspace
          </h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
            Takes about 3 minutes · you can change everything later in Settings
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} total={STEPS.length} />

        {/* Step card */}
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          {/* Step label strip */}
          <div style={{
            display: "flex", alignItems: "baseline", gap: "0.65rem",
            marginBottom: "0.25rem",
          }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>
              Step {step + 1} of {STEPS.length}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>—</span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600 }}>{currentStepInfo.label}</span>
          </div>

          <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {currentStepInfo.label}
          </h2>
          <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            {currentStepInfo.subtitle}
          </p>

          {/* ── Step 1: Profile ── */}
          {step === 0 && (
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div className="field">
                <label style={FIELD_LABEL}>Display name</label>
                <input
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="e.g. Jo Bloggs"
                  required
                  autoFocus
                />
              </div>

              <div className="field">
                <label style={FIELD_LABEL}>Photo URL (optional)</label>
                <input
                  value={profile.avatarUrl.startsWith("data:") ? "" : profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="field">
                <label style={FIELD_LABEL}>Avatar description (optional)</label>
                <input
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  placeholder="e.g. woman with short curly red hair, glasses, blue cardigan — or leave blank to use your name"
                />
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
                  Be specific: hair colour &amp; style, skin tone, clothing, age, accessories. The more detail, the better the match.
                </p>
              </div>

              <div>
                <label style={FIELD_LABEL}>Or upload / generate a photo</label>

                {/* Photo options row */}
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                  {/* Upload */}
                  <div className="field" style={{ margin: 0 }}>
                    <input
                      id={uploadInputId}
                      className="file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={onAvatarChange}
                    />
                    <label
                      htmlFor={uploadInputId}
                      className="landing-thoughts-btn file-upload-cta"
                      style={{ fontSize: "0.84rem", minWidth: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1z" />
                      </svg>
                      Upload photo
                    </label>
                  </div>

                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>or</span>

                  {/* AI generate */}
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

                {avatarFileName && (
                  <span className="muted" style={{ fontSize: "0.78rem", marginTop: "0.5rem", display: "block" }}>
                    {avatarFileName}
                  </span>
                )}
              </div>

              {profile.avatarUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <img
                    src={profile.avatarUrl}
                    alt="Profile preview"
                    style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)", flexShrink: 0 }}
                  />
                  <div>
                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>
                      Preview
                    </p>
                    <button
                      type="button"
                      onClick={() => { setProfile((p) => ({ ...p, avatarUrl: "" })); setAvatarFileName(""); }}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.78rem", color: "var(--muted)", textDecoration: "underline", fontFamily: "inherit" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Defaults & Terms ── */}
          {step === 1 && (
            <div style={{ display: "grid", gap: "1.75rem" }}>
              {/* Defaults */}
              <div>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Lesson defaults
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.9rem" }}>
                  <div className="field">
                    <label style={FIELD_LABEL}>Default year group</label>
                    <select value={profile.defaultYearGroup} onChange={(e) => setProfile({ ...profile, defaultYearGroup: e.target.value })} style={SELECT_STYLE}>
                      {YEAR_GROUPS.map((yg) => <option key={yg} value={yg}>{yg}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label style={FIELD_LABEL}>Default subject</label>
                    <select value={profile.defaultSubject} onChange={(e) => setProfile({ ...profile, defaultSubject: e.target.value })} style={SELECT_STYLE}>
                      {SUBJECT_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Term dates */}
              <div>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Term dates
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                  {terms.length === 0 && (
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                      No terms added yet. You can skip this and add them later in Settings.
                    </p>
                  )}
                  {terms.map((term, index) => {
                    const active = termIsActive(term);
                    return (
                      <div key={term.id} style={{ border: active ? "1.5px solid #10b981" : "1px solid var(--border)", borderRadius: "14px", padding: "0.95rem", background: active ? "rgb(16 185 129 / 0.04)" : "var(--field-bg)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>Term {index + 1}</span>
                            <span style={{
                              padding: "0.28rem 0.7rem", borderRadius: "999px", fontSize: "0.73rem", fontWeight: 700,
                              background: active ? "rgb(16 185 129 / 0.12)" : "rgb(148 163 184 / 0.14)",
                              color: active ? "#10b981" : "var(--muted)",
                              border: active ? "1px solid rgb(16 185 129 / 0.35)" : "1px solid var(--border)",
                            }}>
                              {active ? "Current term" : "Inactive"}
                            </span>
                          </div>
                          <button type="button" className="button secondary" onClick={() => removeTerm(term.id)}>Remove</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem" }}>
                          <div className="field">
                            <label style={FIELD_LABEL}>Term name</label>
                            <input value={term.termName} onChange={(e) => updateTerm(term.id, { termName: e.target.value })} placeholder="e.g. Spring 1" />
                          </div>
                          <div className="field">
                            <label style={FIELD_LABEL}>Start date</label>
                            <input type="date" value={term.termStartDate} onChange={(e) => updateTerm(term.id, { termStartDate: e.target.value })} style={{ width: "100%" }} />
                          </div>
                          <div className="field">
                            <label style={FIELD_LABEL}>End date</label>
                            <input type="date" value={term.termEndDate} onChange={(e) => updateTerm(term.id, { termEndDate: e.target.value })} style={{ width: "100%" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div>
                    <button type="button" className="button secondary" onClick={addEmptyTerm}>+ Add term</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Tone & School ── */}
          {step === 2 && (
            <div style={{ display: "grid", gap: "1.75rem" }}>
              <div>
                <label style={{ ...FIELD_LABEL, marginBottom: "0.6rem" }}>Language tone</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {TONE_OPTIONS.map((opt) => (
                    <RadioCard key={opt.value} active={profile.tone === opt.value} onClick={() => setProfile({ ...profile, tone: opt.value })} label={opt.label} desc={opt.desc} />
                  ))}
                </div>
              </div>

              <div>
                <label style={FIELD_LABEL}>School type</label>
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                  {SCHOOL_TYPE_OPTIONS.map((opt) => {
                    const active = profile.schoolType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setProfile({ ...profile, schoolType: opt.value })}
                        style={{
                          padding: "0.5rem 1.15rem", borderRadius: "999px",
                          border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                          background: active ? "rgb(var(--accent-rgb) / 0.1)" : "var(--field-bg)",
                          color: active ? "var(--accent)" : "var(--text)",
                          fontSize: "0.84rem", fontWeight: active ? 600 : 400,
                          cursor: "pointer", fontFamily: "inherit", transition: "all 160ms ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Teaching ── */}
          {step === 3 && (
            <div style={{ display: "grid", gap: "1.75rem" }}>
              <div>
                <label style={{ ...FIELD_LABEL, marginBottom: "0.6rem" }}>Teaching approach</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {TEACHING_APPROACH_OPTIONS.map((opt) => (
                    <RadioCard key={opt.value} active={profile.teachingApproach === opt.value} onClick={() => setProfile({ ...profile, teachingApproach: opt.value })} label={opt.label} desc={opt.desc} />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ ...FIELD_LABEL, marginBottom: "0.6rem" }}>Class ability mix</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {ABILITY_MIX_OPTIONS.map((opt) => (
                    <RadioCard key={opt.value} active={profile.abilityMix === opt.value} onClick={() => setProfile({ ...profile, abilityMix: opt.value })} label={opt.label} desc={opt.desc} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Class Details ── */}
          {step === 4 && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <label style={{ ...FIELD_LABEL, marginBottom: "0.6rem" }}>Class profile percentages</label>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                  These are required before lesson pack generation. Enter whole-number percentages from 0 to 100.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.7rem" }}>
                  {([
                    ["ealPercent", "% class EAL (English as second language)"],
                    ["pupilPremiumPercent", "% class on pupil premium (vocabulary prompts)"],
                    ["aboveStandardPercent", "% class generally above standard"],
                    ["belowStandardPercent", "% class generally below standard"],
                    ["hugelyAboveStandardPercent", "% class hugely above standard"],
                    ["hugelyBelowStandardPercent", "% class hugely below standard"],
                  ] as [keyof Profile, string][]).map(([key, lbl]) => (
                    <div key={key} className="field">
                      <label style={{ ...FIELD_LABEL, fontSize: "0.76rem", minHeight: "2.4em" }}>{lbl}</label>
                      <input type="number" min={0} max={100} step={1} value={profile[key] as number | ""} onChange={(e) => updatePercentField(key, e.target.value)} style={{ width: "100%" }} />
                    </div>
                  ))}
                </div>
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: attainmentTotal > 100 ? "#fc8181" : "var(--muted)" }}>
                  Combined attainment bands (above/below/hugely above/hugely below): {attainmentTotal}%{attainmentTotal > 100 ? " — must be 100% or less" : ""}
                </p>
              </div>

              <div>
                <label style={{ ...FIELD_LABEL, marginBottom: "0.4rem" }}>About my class</label>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                  Tell the AI anything specific about your class — scheme of work, EAL learners, TA support, grouping, or anything else that should shape the content.
                  This must be at least 200 characters before lesson packs can be generated.
                </p>
                <textarea
                  value={profile.classNotes}
                  onChange={(e) => setProfile({ ...profile, classNotes: e.target.value })}
                  placeholder="e.g. We follow White Rose Maths. 6 EAL learners at early fluency. A TA supports a lower group of 8. Many pupils find word problems difficult."
                  rows={4}
                  style={{
                    width: "100%", boxSizing: "border-box", resize: "vertical",
                    border: "1px solid var(--border)", background: "var(--field-bg)", color: "var(--text)",
                    borderRadius: "10px", padding: "0.65rem 0.75rem", fontSize: "0.87rem",
                    fontFamily: "inherit", lineHeight: 1.6, outline: "none",
                  }}
                />
                <p style={{ margin: "0.55rem 0 0", fontSize: "0.78rem", color: classNotesRemaining === 0 ? "#4ade80" : "var(--muted)" }}>
                  Minimum {MIN_CLASS_NOTES_CHARS} characters required.{" "}
                  {classNotesLength} entered
                  {classNotesRemaining > 0 ? ` (${classNotesRemaining} more needed)` : " (requirement met)"}
                </p>
              </div>
            </div>
          )}

          {/* ── Step 6: Preferences ── */}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
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
          )}

          {/* Error */}
          {error && (
            <p style={{ margin: "1rem 0 0", color: "#fc8181", fontSize: "0.84rem" }}>{error}</p>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              className="button secondary"
              onClick={handleBack}
              disabled={step === 0}
              style={{ opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? "none" : "auto" }}
            >
              ← Back
            </button>

            <button
              type="button"
              className="nav-btn-cta"
              onClick={handleNext}
              disabled={saving}
              style={{ justifyContent: "center", minWidth: 140, gap: "0.45rem" }}
            >
              {saving ? (
                <>
                  <span style={{ width: "11px", height: "11px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.65s linear infinite", flexShrink: 0 }} />
                  Saving…
                </>
              ) : isLastStep ? "Finish setup →" : "Continue →"}
            </button>
          </div>
        </div>

        {/* Skip to dashboard */}
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.8rem", color: "var(--muted)" }}>
          <a
            href={nextPath}
            style={{ color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: "2px" }}
          >
            Skip setup and go to dashboard
          </a>
        </p>
      </div>
    </main>
  );
}
