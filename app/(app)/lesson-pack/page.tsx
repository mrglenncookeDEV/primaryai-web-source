"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type DiffGroup = { group_size_hint: string; activity: string; questions: string[]; talk_prompt: string; exit_ticket: string; extension?: string };
type DiffPack = { lower: DiffGroup; core: DiffGroup; higher: DiffGroup };

const DIFF_GROUP_META = {
  lower: { label: "Lower Group", color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.18)", bloomsLevel: "Recall & Understand" },
  core:  { label: "Core Group",  color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", bloomsLevel: "Apply & Analyse" },
  higher:{ label: "Higher Group",color: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.18)", bloomsLevel: "Evaluate & Create" },
} as const;

function DifferentiationPanel({ diff }: { diff: DiffPack }) {
  const [active, setActive] = useState<"lower" | "core" | "higher">("core");
  const group = diff[active];
  const meta = DIFF_GROUP_META[active];
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "0.85rem 1.1rem 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Differentiation by Group</span>
            <span style={{ fontSize: "0.68rem", padding: "2px 7px", borderRadius: "999px", background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", fontWeight: 700 }}>AI Generated</span>
          </div>
          {group.group_size_hint && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{group.group_size_hint}</span>}
        </div>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {(["lower", "core", "higher"] as const).map((key) => {
            const m = DIFF_GROUP_META[key];
            return (
              <button key={key} type="button" onClick={() => setActive(key)} style={{ padding: "0.4rem 0.85rem", borderRadius: "8px 8px 0 0", border: `1px solid ${active === key ? m.color : "var(--border)"}`, borderBottom: active === key ? `2px solid ${m.color}` : "1px solid var(--border)", background: active === key ? `color-mix(in srgb, ${m.color} 10%, var(--surface))` : "transparent", color: active === key ? m.color : "var(--muted)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 120ms" }}>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "1rem 1.1rem 1.1rem", background: meta.bg, borderTop: `2px solid ${meta.color}` }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>Bloom&apos;s focus: {meta.bloomsLevel}</span>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.4rem", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>Activity</p>
          <p style={{ margin: 0, fontSize: "0.87rem", lineHeight: 1.65, color: "var(--text)" }}>{group.activity}</p>
        </div>
        {group.questions?.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>Critical Thinking Questions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {group.questions.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%", background: meta.color, color: "#fff", fontSize: "0.65rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.55, color: "var(--text)" }}>{q}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ padding: "0.7rem 0.85rem", borderRadius: "10px", background: "var(--surface)", border: `1px solid ${meta.border}` }}>
            <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>💬 Talk Prompt</p>
            <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.55, color: "var(--text)" }}>{group.talk_prompt}</p>
          </div>
          <div style={{ padding: "0.7rem 0.85rem", borderRadius: "10px", background: "var(--surface)", border: `1px solid ${meta.border}` }}>
            <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>🎯 Exit Ticket</p>
            <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.55, color: "var(--text)" }}>{group.exit_ticket}</p>
          </div>
        </div>
        {"extension" in group && group.extension && (
          <div style={{ marginTop: "0.75rem", padding: "0.7rem 0.85rem", borderRadius: "10px", background: "var(--surface)", border: `1px solid ${meta.border}` }}>
            <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>⚡ Extension</p>
            <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.55, color: "var(--text)" }}>{group.extension}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  cerebras: "Cerebras",
  groq: "Groq",
  gemini: "Gemini",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  cohere: "Cohere",
  "cloudflare-worker": "Cloudflare AI",
  huggingface: "HuggingFace",
};

type ProviderStatus = "pending" | "searching" | "done" | "failed";
type ProviderState = {
  status: ProviderStatus | "rate_limited" | "unavailable";
  error?: string;
};
type EngineStatus = {
  providers: Record<string, ProviderState>;
  pass: string | null;
  ensembled: boolean;
};
type ProviderCatalogItem = {
  id: string;
  available: boolean;
  rateLimited?: boolean;
};

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
  differentiation?: {
    lower: { group_size_hint: string; activity: string; questions: string[]; talk_prompt: string; exit_ticket: string };
    core: { group_size_hint: string; activity: string; questions: string[]; talk_prompt: string; exit_ticket: string };
    higher: { group_size_hint: string; activity: string; questions: string[]; talk_prompt: string; exit_ticket: string; extension?: string };
  };
  send_adaptations: string[];
  plenary: string;
  mini_assessment: { questions: string[]; answers: string[] };
  slides: Array<{ title: string; bullets: string[]; speaker_notes?: string }>;
  _meta?: {
    autoSaved?: boolean;
    usedCurriculumObjectives: string[];
    usedContextNotes: boolean;
    usedTeacherProfile: boolean;
    passesRun: Array<"quality" | "alignment" | "finalize">;
    confidence: "high" | "medium" | "low";
    confidenceReason: string;
  };
};

type LessonPackResponse = LessonPack | { error: string };
type ExportResponse = { ok: boolean; format: string; data: unknown } | { error: string };

type ClassProfile = {
  ealPercent: number | null;
  pupilPremiumPercent: number | null;
  aboveStandardPercent: number | null;
  belowStandardPercent: number | null;
  hugelyAboveStandardPercent: number | null;
  hugelyBelowStandardPercent: number | null;
  classNotes: string;
  schoolType: string;
  sendFocus: boolean;
  abilityMix: string;
};

const YEAR_GROUPS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const MIN_CLASS_NOTES_CHARS = 200;
const CONTEXT_FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt,.md,.csv,.json,.tsv,.log,.rtf,.ods";
const GUIDED_REVIEW_PROMPTS = [
  "Tighten objectives",
  "Simplify pupil explanation",
  "Improve worked example",
  "Increase challenge",
  "Add scaffolds",
  "Improve SEND adaptations",
  "Strengthen assessment",
  "Improve curriculum alignment",
] as const;
const SECTION_REVIEW_OPTIONS = {
  objectives: ["Clear", "Too broad", "Not measurable"],
  worked_example: ["Clear", "Needs modelling", "Too abstract"],
  activities: ["Well differentiated", "Too similar", "Needs scaffolds"],
  adaptations: ["Useful", "Too generic", "Needs specificity"],
} as const;

const SUBJECT_GROUPS = [
  { label: "Core Subjects", subjects: ["Maths", "English", "Science"] },
  { label: "Humanities", subjects: ["History", "Geography"] },
  { label: "Arts & Technology", subjects: ["Art and Design", "Design and Technology", "Music", "Computing"] },
  { label: "Physical & Wellbeing", subjects: ["PE", "PSHE", "RE"] },
  { label: "Modern Foreign Languages", subjects: ["French", "Spanish", "German", "Mandarin", "Modern Foreign Languages"] },
];

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fileNameWithoutExtension(name: string) {
  return String(name || "").replace(/\.[^.]+$/, "").trim();
}

function isPack(r: LessonPackResponse): r is LessonPack {
  return !("error" in r);
}

function buildInitialProviderStates(providerCatalog: ProviderCatalogItem[]) {
  return providerCatalog.reduce<Record<string, ProviderState>>((acc, provider) => {
    acc[provider.id] = {
      status: provider.available ? (provider.rateLimited ? "rate_limited" : "pending") : "unavailable",
    };
    return acc;
  }, {});
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children, color = "var(--accent)" }: { children: ReactNode; color?: string }) {
  return (
    <h3 style={{
      margin: "0 0 0.85rem",
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color,
      display: "flex",
      alignItems: "center",
      gap: "0.45rem",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
      {children}
    </h3>
  );
}

function RevealItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ marginBottom: "0.85rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <span style={{
        flexShrink: 0,
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "rgb(var(--accent-rgb) / 0.14)",
        color: "var(--accent)",
        fontSize: "0.7rem",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "2px",
      }}>{index + 1}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text)" }}>{question}</p>
        {revealed ? (
          <p style={{
            margin: 0,
            fontSize: "0.83rem",
            lineHeight: 1.5,
            color: "#4ade80",
            padding: "0.4rem 0.75rem",
            borderRadius: "8px",
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.16)",
          }}>{answer}</p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            style={{
              fontSize: "0.74rem",
              color: "var(--accent)",
              background: "rgb(var(--accent-rgb) / 0.08)",
              border: "1px solid rgb(var(--accent-rgb) / 0.2)",
              borderRadius: "6px",
              padding: "0.22rem 0.65rem",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
            </svg>
            Show answer
          </button>
        )}
      </div>
    </div>
  );
}

function SlideCard({ slide, index }: { slide: { title: string; bullets: string[]; speaker_notes?: string }; index: number }) {
  const [notesOpen, setNotesOpen] = useState(false);
  return (
    <div style={{
      border: "1px solid var(--border-card)",
      borderRadius: "12px",
      overflow: "hidden",
      minWidth: "256px",
      maxWidth: "272px",
      flexShrink: 0,
      background: "var(--surface)",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 2px 12px rgb(0 0 0 / 0.1)",
    }}>
      <div style={{
        background: "rgb(var(--accent-rgb) / 0.07)",
        borderBottom: "1px solid var(--border-card)",
        padding: "0.55rem 0.8rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <span style={{
          flexShrink: 0,
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "var(--muted)",
          background: "var(--border)",
          padding: "0.1rem 0.4rem",
          borderRadius: "4px",
        }}>{index + 1}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3, flex: 1 }}>{slide.title}</span>
      </div>
      <div style={{ padding: "0.75rem 0.85rem", flex: 1 }}>
        <ul style={{ margin: 0, padding: "0 0 0 1rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
          {slide.bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: "0.25rem" }}>{b}</li>
          ))}
        </ul>
        {slide.speaker_notes && (
          <>
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              style={{
                marginTop: "0.65rem",
                fontSize: "0.72rem",
                color: "var(--muted)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", transition: "transform 180ms ease", transform: notesOpen ? "rotate(90deg)" : "none", flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {notesOpen ? "Hide notes" : "Speaker notes"}
            </button>
            {notesOpen && (
              <p style={{
                margin: "0.5rem 0 0",
                fontSize: "0.77rem",
                fontStyle: "italic",
                color: "var(--muted)",
                lineHeight: 1.55,
                paddingTop: "0.5rem",
                borderTop: "1px solid var(--border)",
              }}>{slide.speaker_notes}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LessonPackPage() {
  const searchParams = useSearchParams();
  const forceSaveFromScheduler = searchParams?.get("from") === "scheduler";
  const [form, setForm] = useState({ year_group: "", subject: "", topic: "" });
  const [result, setResult] = useState<LessonPackResponse | null>(null);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [feedback, setFeedback] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [classNotesLength, setClassNotesLength] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [providerCatalog, setProviderCatalog] = useState<ProviderCatalogItem[]>([]);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [contextFileName, setContextFileName] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [contextError, setContextError] = useState("");
  const [contextParsing, setContextParsing] = useState(false);
  const [contextChars, setContextChars] = useState(0);
  const [reviewTouched, setReviewTouched] = useState(false);
  const [guidedFeedback, setGuidedFeedback] = useState<string[]>([]);
  const [sectionReview, setSectionReview] = useState<Record<string, string>>({});
  const [exportWarning, setExportWarning] = useState<null | { type: "export"; format: "lesson-pdf" | "slides-pptx" | "worksheet-doc" } | { type: "save" }>(null);
  const [uploadLessonOpen, setUploadLessonOpen] = useState(false);
  const [uploadLessonSaving, setUploadLessonSaving] = useState(false);
  const [uploadLessonError, setUploadLessonError] = useState("");
  const [uploadLessonFile, setUploadLessonFile] = useState<File | null>(null);
  const [uploadLessonDraft, setUploadLessonDraft] = useState({
    yearGroup: "",
    subject: "",
    topic: "",
    title: "",
    scheduledDate: "",
    startTime: "09:00",
    endTime: "10:00",
    notes: "",
  });
  const isLibraryLoadRef = useRef(false);
  const [classProfile, setClassProfile] = useState<ClassProfile | null>(null);
  const [reflectQuestions, setReflectQuestions] = useState<string[]>([]);
  const [reflectAcknowledged, setReflectAcknowledged] = useState<Record<number, boolean>>({});
  const [reflectLoading, setReflectLoading] = useState(false);

  const [settingsChecklist, setSettingsChecklist] = useState({
    ealPercent: false,
    pupilPremiumPercent: false,
    aboveStandardPercent: false,
    belowStandardPercent: false,
    hugelyAboveStandardPercent: false,
    hugelyBelowStandardPercent: false,
    attainmentBandsValid: false,
  });

  function showClassNotesToast() {
    const remaining = Math.max(0, MIN_CLASS_NOTES_CHARS - classNotesLength);
    const missing: string[] = [];
    if (!settingsChecklist.ealPercent) missing.push("EAL %");
    if (!settingsChecklist.pupilPremiumPercent) missing.push("Pupil Premium %");
    if (!settingsChecklist.aboveStandardPercent) missing.push("Above standard %");
    if (!settingsChecklist.belowStandardPercent) missing.push("Below standard %");
    if (!settingsChecklist.hugelyAboveStandardPercent) missing.push("Hugely above %");
    if (!settingsChecklist.hugelyBelowStandardPercent) missing.push("Hugely below %");
    if (!settingsChecklist.attainmentBandsValid) missing.push("attainment totals");
    if (remaining > 0) {
      setToast(`Complete About My Class first (${remaining} characters remaining).`);
      return;
    }
    if (missing.length > 0) {
      setToast(`Complete teacher settings first: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}.`);
      return;
    }
    setToast("Complete teacher settings in Settings before generating lesson packs.");
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function trackTelemetry(event: string, payload: Record<string, unknown> = {}) {
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, payload }),
      });
    } catch {
      // Non-blocking
    }
  }

  function markReviewInteraction(event: string, payload: Record<string, unknown> = {}) {
    setReviewTouched(true);
    void trackTelemetry(event, payload);
  }

  // Fetch class-specific reflection prompts after any new generation
  useEffect(() => {
    if (!result || !isPack(result)) return;
    if (isLibraryLoadRef.current) {
      isLibraryLoadRef.current = false;
      return;
    }
    setReflectLoading(true);
    setReflectQuestions([]);
    setReflectAcknowledged({});
    fetch("/api/lesson-pack/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: result, profile: classProfile }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.questions) && data.questions.length > 0) {
          setReflectQuestions(data.questions.slice(0, 4));
        }
      })
      .catch(() => { /* non-blocking */ })
      .finally(() => setReflectLoading(false));
  // classProfile is stable after mount; result is the intended trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function toggleGuidedFeedback(label: string) {
    setGuidedFeedback((prev) => {
      const next = prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label];
      return next;
    });
    markReviewInteraction("lesson_pack_review_opened", { prompt: label });
  }

  function setSectionReviewChoice(section: string, value: string) {
    setSectionReview((prev) => ({ ...prev, [section]: value }));
    markReviewInteraction("lesson_pack_section_flagged", { section, value });
  }

  function buildFeedbackPayload() {
    const parts: string[] = [];
    if (guidedFeedback.length > 0) {
      parts.push(`Requested review focus: ${guidedFeedback.join("; ")}.`);
    }
    const sectionNotes = Object.entries(sectionReview)
      .filter(([, value]) => value && !["Clear", "Useful", "Well differentiated"].includes(value))
      .map(([section, value]) => `${section}: ${value}`);
    if (sectionNotes.length > 0) {
      parts.push(`Section review notes: ${sectionNotes.join("; ")}.`);
    }
    if (feedback.trim()) {
      parts.push(feedback.trim());
    }
    return parts.join("\n\n").trim();
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/lesson-pack/providers", { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.providers)) {
          setProviderCatalog(
            data.providers.map((provider: ProviderCatalogItem) => ({
              id: String(provider.id || ""),
              available: Boolean(provider.available),
              rateLimited: Boolean(provider.rateLimited),
            })),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Load profile defaults
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        const profile = data?.profile;
        if (!profile) return;
        const toInt = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : null);
        const ealPercent = toInt(profile.ealPercent);
        const pupilPremiumPercent = toInt(profile.pupilPremiumPercent);
        const aboveStandardPercent = toInt(profile.aboveStandardPercent);
        const belowStandardPercent = toInt(profile.belowStandardPercent);
        const hugelyAboveStandardPercent = toInt(profile.hugelyAboveStandardPercent);
        const hugelyBelowStandardPercent = toInt(profile.hugelyBelowStandardPercent);
        const attainmentTotal =
          (aboveStandardPercent ?? 0) +
          (belowStandardPercent ?? 0) +
          (hugelyAboveStandardPercent ?? 0) +
          (hugelyBelowStandardPercent ?? 0);
        setForm((prev) => ({
          year_group: prev.year_group || profile.defaultYearGroup || "",
          subject: prev.subject || profile.defaultSubject || "",
          topic: prev.topic,
        }));
        setClassNotesLength((profile.classNotes ?? "").trim().length);
        setSettingsChecklist({
          ealPercent: ealPercent !== null,
          pupilPremiumPercent: pupilPremiumPercent !== null,
          aboveStandardPercent: aboveStandardPercent !== null,
          belowStandardPercent: belowStandardPercent !== null,
          hugelyAboveStandardPercent: hugelyAboveStandardPercent !== null,
          hugelyBelowStandardPercent: hugelyBelowStandardPercent !== null,
          attainmentBandsValid: attainmentTotal <= 100,
        });
        setClassProfile({
          ealPercent,
          pupilPremiumPercent,
          aboveStandardPercent,
          belowStandardPercent,
          hugelyAboveStandardPercent,
          hugelyBelowStandardPercent,
          classNotes: String(profile.classNotes ?? ""),
          schoolType: String(profile.schoolType ?? "primary"),
          sendFocus: Boolean(profile.sendFocus),
          abilityMix: String(profile.abilityMix ?? "mixed"),
        });
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, []);

  // Load saved pack from library if ?id= is present
  useEffect(() => {
    const id = searchParams?.get("id");
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/library/${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const data = await res.json();
        const item = data?.item;
        if (!item) return;
        const pack = JSON.parse(item.json);
        setResult(pack);
        setForm({ year_group: item.year_group ?? pack.year_group ?? "", subject: item.subject ?? pack.subject ?? "", topic: item.topic ?? pack.topic ?? "" });
        isLibraryLoadRef.current = true;
        setSaveState("saved");
        setSaveMsg("Loaded from library");
        setReviewTouched(false);
        setGuidedFeedback([]);
        setSectionReview({});
      } catch {
        // silently ignore — user can generate normally
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  async function handleContextFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setContextError("");
    setContextNotes("");
    setContextChars(0);
    if (!file) {
      setContextFileName("");
      return;
    }

    setContextFileName(file.name);
    setContextParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/lesson-pack/parse-context", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setContextError(data?.error ?? "Could not read that file.");
        return;
      }

      setContextNotes(data.text);
      setContextChars(data.chars);
      if (data.truncated) {
        setContextError(`Document is large — first 12,000 characters used (${data.chars.toLocaleString()} total).`);
      }
    } catch {
      setContextError("Upload failed. Check your connection and try again.");
    } finally {
      setContextParsing(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canGenerate) {
      showClassNotesToast();
      return;
    }
    setLoading(true);
    setResult(null);
    setExportResult(null);
    setSaveState("idle");
    setSaveMsg("");
    setReviewTouched(false);
    setGuidedFeedback([]);
    setSectionReview({});
    setReflectQuestions([]);
    setReflectAcknowledged({});
    setEngineStatus({ providers: buildInitialProviderStates(providerCatalog), pass: null, ensembled: false });
    void trackTelemetry("lesson_pack_generated", { yearGroup: form.year_group, subject: form.subject, topic: form.topic });

    try {
      const res = await fetch("/api/lesson-pack/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          context_notes: contextNotes || undefined,
          forceSave: forceSaveFromScheduler,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        setResult(data);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "provider_start") {
              setEngineStatus((prev) => prev ? {
                ...prev,
                providers: { ...prev.providers, [event.id]: { status: "searching" } },
              } : prev);
            } else if (event.type === "provider_done") {
              setEngineStatus((prev) => prev ? {
                ...prev,
                providers: {
                  ...prev.providers,
                  [event.id]: { status: event.ok ? "done" : "failed", error: event.error ? String(event.error) : undefined },
                },
              } : prev);
            } else if (event.type === "ensemble") {
              setEngineStatus((prev) => prev ? { ...prev, ensembled: true } : prev);
            } else if (event.type === "pass") {
              setEngineStatus((prev) => prev ? { ...prev, pass: event.name } : prev);
            } else if (event.type === "pack") {
              setResult(event.pack as LessonPackResponse);
            } else if (event.type === "error") {
              setResult({ error: event.message });
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc", allowWithoutReview = false) {
    if (!result || !isPack(result)) return;
    if (reflectLoading) {
      setToast("Class reflection is still loading — please wait a moment.");
      return;
    }
    const reflectDone = reflectQuestions.length === 0 || reflectQuestions.every((_, i) => reflectAcknowledged[i]);
    if (!reflectDone) {
      setToast("Review all class reflection prompts before exporting.");
      return;
    }
    if (!reviewTouched && !allowWithoutReview) {
      setExportWarning({ type: "export", format });
      return;
    }
    const res = await fetch("/api/lesson-pack/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, pack: result }),
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const header = res.headers.get("content-disposition") || "";
    const filenameMatch = /filename=\"?([^\";]+)\"?/i.exec(header);
    const fallback = `${result.subject}-${result.topic}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const fallbackExt = format === "lesson-pdf" ? ".pdf" : format === "slides-pptx" ? ".pptx" : ".doc";
    const filename = filenameMatch?.[1] || `${fallback}${fallbackExt}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    void trackTelemetry(allowWithoutReview ? "lesson_pack_exported_without_review" : "lesson_pack_exported_after_review", { format });
  }

  async function handleManualSave(allowWithoutReview = false) {
    if (!result || !isPack(result) || saveState === "saving" || saveState === "saved") return;
    if (reflectLoading) {
      setToast("Class reflection is still loading — please wait a moment.");
      return;
    }
    const reflectDone = reflectQuestions.length === 0 || reflectQuestions.every((_, i) => reflectAcknowledged[i]);
    if (!reflectDone) {
      setToast("Review all class reflection prompts before saving.");
      return;
    }
    if (!reviewTouched && !allowWithoutReview) {
      setExportWarning({ type: "save" });
      return;
    }
    setSaveState("saving");
    setSaveMsg("");
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: result }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaveState("saved");
      void trackTelemetry(allowWithoutReview ? "lesson_pack_saved_without_review" : "lesson_pack_saved_after_review");
    } else {
      setSaveState("error");
      setSaveMsg(res.status === 401 ? "Sign in to save to your library" : (data?.error ?? "Save failed"));
    }
  }

  async function handleRegenerate() {
    const compiledFeedback = buildFeedbackPayload();
    if (!compiledFeedback || regenLoading) return;
    if (!canGenerate) {
      showClassNotesToast();
      return;
    }
    setRegenLoading(true);
    setExportResult(null);
    setSaveState("idle");
    setSaveMsg("");
    markReviewInteraction("lesson_pack_regenerated", { guidedFeedback, sectionReview });
    setReflectQuestions([]);
    setReflectAcknowledged({});
    setEngineStatus({ providers: buildInitialProviderStates(providerCatalog), pass: null, ensembled: false });

    try {
      const res = await fetch("/api/lesson-pack/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          feedback: compiledFeedback,
          context_notes: contextNotes || undefined,
          forceSave: forceSaveFromScheduler,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Regeneration failed" }));
        setResult(data);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "provider_start") {
              setEngineStatus((prev) => prev ? {
                ...prev,
                providers: { ...prev.providers, [event.id]: { status: "searching" } },
              } : prev);
            } else if (event.type === "provider_done") {
              setEngineStatus((prev) => prev ? {
                ...prev,
                providers: {
                  ...prev.providers,
                  [event.id]: { status: event.ok ? "done" : "failed", error: event.error ? String(event.error) : undefined },
                },
              } : prev);
            } else if (event.type === "ensemble") {
              setEngineStatus((prev) => prev ? { ...prev, ensembled: true } : prev);
            } else if (event.type === "pass") {
              setEngineStatus((prev) => prev ? { ...prev, pass: event.name } : prev);
            } else if (event.type === "pack") {
              setResult(event.pack as LessonPackResponse);
              setFeedback("");
              setGuidedFeedback([]);
            } else if (event.type === "error") {
              setResult({ error: event.message });
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }
    } finally {
      setRegenLoading(false);
    }
  }

  function openUploadLessonModal() {
    setUploadLessonDraft({
      yearGroup: form.year_group || "",
      subject: form.subject || "",
      topic: form.topic || "",
      title: form.topic.trim() || "Uploaded lesson",
      scheduledDate: todayIso(),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    });
    setUploadLessonFile(null);
    setUploadLessonError("");
    setUploadLessonOpen(true);
  }

  async function handleUploadOwnLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadLessonDraft.yearGroup || !uploadLessonDraft.subject || !uploadLessonDraft.topic.trim()) {
      setUploadLessonError("Complete year group, subject, and topic.");
      return;
    }
    if (!uploadLessonFile) {
      setUploadLessonError("Choose a lesson file to upload.");
      return;
    }
    if (!uploadLessonDraft.scheduledDate) {
      setUploadLessonError("Choose a date for the lesson event.");
      return;
    }
    if (uploadLessonDraft.startTime >= uploadLessonDraft.endTime) {
      setUploadLessonError("End time must be after start time.");
      return;
    }

    setUploadLessonSaving(true);
    setUploadLessonError("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", uploadLessonFile);

      const uploadRes = await fetch("/api/library/documents", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadJson?.document?.id) {
        throw new Error(uploadJson?.error || "Could not upload the lesson file.");
      }

      const scheduleRes = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "custom",
          eventCategory: "Uploaded Lesson",
          title: uploadLessonDraft.title.trim() || uploadLessonDraft.topic.trim() || fileNameWithoutExtension(uploadLessonFile.name),
          subject: uploadLessonDraft.subject,
          yearGroup: uploadLessonDraft.yearGroup,
          scheduledDate: uploadLessonDraft.scheduledDate,
          startTime: uploadLessonDraft.startTime,
          endTime: uploadLessonDraft.endTime,
          notes: uploadLessonDraft.notes.trim() || null,
          linkedDocumentId: String(uploadJson.document.id),
          linkedDocumentName: String(uploadJson.document.name || uploadLessonFile.name),
        }),
      });
      const scheduleJson = await scheduleRes.json().catch(() => ({}));
      if (!scheduleRes.ok || !scheduleJson?.ok) {
        throw new Error(scheduleJson?.error || "Could not create the lesson event.");
      }

      setUploadLessonOpen(false);
      setUploadLessonFile(null);
      setToast("Uploaded lesson added to your timetable.");
    } catch (err) {
      setUploadLessonError(err instanceof Error ? err.message : "Could not upload your lesson.");
    } finally {
      setUploadLessonSaving(false);
    }
  }

  const pack = result && isPack(result) ? result : null;
  const errorMsg = result && !isPack(result) ? (result as { error: string }).error : null;
  const classNotesRemaining = Math.max(0, MIN_CLASS_NOTES_CHARS - classNotesLength);
  const classNotesReady = classNotesLength >= MIN_CLASS_NOTES_CHARS;
  const teacherSettingsReady =
    settingsChecklist.ealPercent &&
    settingsChecklist.pupilPremiumPercent &&
    settingsChecklist.aboveStandardPercent &&
    settingsChecklist.belowStandardPercent &&
    settingsChecklist.hugelyAboveStandardPercent &&
    settingsChecklist.hugelyBelowStandardPercent &&
    settingsChecklist.attainmentBandsValid;
  const canGenerate = profileLoaded && classNotesReady && teacherSettingsReady;
  const reflectionsComplete = reflectQuestions.length === 0 || reflectQuestions.every((_, i) => reflectAcknowledged[i]);
  const reviewSectionButton = (section: string, value: string) => (
    <button
      type="button"
      key={`${section}-${value}`}
      onClick={() => setSectionReviewChoice(section, value)}
      style={{
        fontSize: "0.72rem",
        fontWeight: 600,
        fontFamily: "inherit",
        borderRadius: "999px",
        cursor: "pointer",
        padding: "0.28rem 0.6rem",
        border: sectionReview[section] === value ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: sectionReview[section] === value ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
        color: sectionReview[section] === value ? "var(--accent)" : "var(--muted)",
      }}
    >
      {value}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="page-wrap">
      {toast ? (
        <div className="surveyx-toast" role="status" aria-live="assertive">
          {toast}
        </div>
      ) : null}

      {/* Page header */}
      <div style={{ marginBottom: "1.75rem", display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)", flexShrink: 0, marginTop: "4px" }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8M8 11h6"/>
        </svg>
        <div>
          <h1 style={{
            margin: "0 0 0.3rem",
            fontSize: "1.55rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text)",
          }}>Lesson Pack Generator</h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5 }}>
            Complete, curriculum-aligned resources generated in seconds — objectives, differentiated activities, slides, and more.
          </p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="hero" style={{ marginBottom: "2rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 35%, transparent) 70%, transparent 100%)", borderRadius: "20px 20px 0 0" }} />
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "1rem" }}>

            <div className="field">
              <label>Year Group</label>
              <select
                value={form.year_group}
                onChange={(e) => setForm({ ...form, year_group: e.target.value })}
                required
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--field-bg)",
                  color: form.year_group ? "var(--text)" : "var(--muted)",
                  borderRadius: "10px",
                  padding: "0.62rem 0.7rem",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                  transition: "border-color 180ms ease",
                  appearance: "none" as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2393a4bf' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  paddingRight: "2.2rem",
                }}
              >
                <option value="" disabled>Select year group…</option>
                {YEAR_GROUPS.map((yg) => (
                  <option key={yg} value={yg}>{yg}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--field-bg)",
                  color: form.subject ? "var(--text)" : "var(--muted)",
                  borderRadius: "10px",
                  padding: "0.62rem 0.7rem",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                  transition: "border-color 180ms ease",
                  appearance: "none" as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2393a4bf' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  paddingRight: "2.2rem",
                }}
              >
                <option value="" disabled>Select subject…</option>
                {SUBJECT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Topic</label>
              <input
                placeholder="e.g. Fractions, The Water Cycle…"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "0.45rem" }}>Upload Context File (optional)</label>
              <input
                type="file"
                accept={CONTEXT_FILE_ACCEPT}
                className="file-upload-input"
                id="lesson-pack-context-upload"
                onChange={handleContextFileUpload}
              />
              <label htmlFor="lesson-pack-context-upload" className="landing-thoughts-btn file-upload-cta" style={{ opacity: contextParsing ? 0.6 : 1 }}>
                {contextParsing ? "Reading document…" : "Choose Context File"}
              </label>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
                PDF, Word (.docx), Excel (.xlsx), CSV, TXT, Markdown and more. Upload targets, SEN notes, curriculum plans, or any school document.
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: contextNotes ? "#4ade80" : "var(--muted)" }}>
                {contextParsing
                  ? `Reading ${contextFileName}…`
                  : contextNotes
                    ? `${contextFileName} · ${contextChars > 0 ? contextChars.toLocaleString() : contextNotes.length.toLocaleString()} characters extracted`
                    : contextFileName
                      ? contextFileName
                      : "No document selected"}
              </p>
              {contextError ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: contextError.includes("large") ? "var(--muted)" : "#fc8181" }}>{contextError}</p>
              ) : null}
            </div>

          </div>

          <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", alignItems: "stretch" }}>
            <button
              type="submit"
              disabled={loading}
              className="nav-btn-cta"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.85rem 1.5rem",
                fontSize: "0.92rem",
                borderRadius: "12px",
                opacity: loading ? 0.72 : 1,
                gap: "0.6rem",
                background: loading ? undefined : "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 75%, var(--accent-hover)) 100%)",
                boxShadow: loading ? undefined : "0 2px 16px rgb(var(--accent-rgb) / 0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.65s linear infinite",
                    flexShrink: 0,
                  }} />
                  Generating your lesson pack…
                </>
              ) : (
                <>
                  {profileLoaded && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" fill="currentColor" opacity="0.3"/>
                      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
                      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>
                    </svg>
                  )}
                  {!profileLoaded ? "Loading your profile…" : "Generate Lesson Pack"}
                </>
              )}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={openUploadLessonModal}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.85rem 1.5rem",
                fontSize: "0.92rem",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                border: "1px solid rgb(var(--accent-rgb) / 0.18)",
                background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, rgb(var(--accent-rgb) / 0.04)) 0%, var(--surface) 100%)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload My Own Lesson
            </button>
          </div>
          <p style={{ margin: "0.65rem 0 0", fontSize: "0.79rem", color: "var(--muted)", lineHeight: 1.5 }}>
            Generate a new PrimaryAI pack, or upload a lesson you created elsewhere and add it to your timetable as an attached event.
          </p>
          {profileLoaded && !canGenerate && (
            <div
              className="auth-message is-error"
              style={{ marginTop: "0.85rem" }}
            >
              <span className="auth-message-text">
                {classNotesRemaining > 0
                  ? `Add at least 200 characters in About My Class before generating lesson packs (${classNotesRemaining} to go). `
                  : "Complete all required teacher settings percentages before generating lesson packs. "}
                {!settingsChecklist.attainmentBandsValid
                  ? "Your attainment percentages must total 100% or less. "
                  : ""}
                {" "}
                <Link href="/settings" style={{ color: "inherit", textDecoration: "underline" }}>
                  Open Settings
                </Link>
              </span>
            </div>
          )}
        </form>
      </div>

      {/* ── Error ── */}
      {errorMsg && (
        <div className="auth-message is-error" style={{ marginBottom: "1.5rem" }}>
          <span className="auth-message-icon">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 10.5h-1.5v-1.5h1.5v1.5zm0-3h-1.5V4.5h1.5V8.5z" />
            </svg>
          </span>
          <span className="auth-message-text">{errorMsg}</span>
        </div>
      )}

      {/* ── Engine Status Panel ── */}
      {(loading || regenLoading) && engineStatus && (
        <div style={{
          marginBottom: "1.5rem",
          borderRadius: "16px",
          border: "1px solid var(--border-card)",
          background: "var(--surface)",
          padding: "1.25rem 1.4rem",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgb(0 0 0 / 0.1), 0 1px 4px rgb(0 0 0 / 0.06)",
          backgroundImage: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.04) 0%, transparent 60%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1rem" }}>
            <div style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              border: "2px solid var(--accent)",
              borderTopColor: "transparent",
              animation: "spin 0.65s linear infinite",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
              {engineStatus.pass === "quality" ? "Running quality check…"
                : engineStatus.pass === "alignment" ? "Checking curriculum alignment…"
                : engineStatus.pass === "finalize" ? "Finalising lesson pack…"
                : engineStatus.ensembled ? "Combining best results…"
                : "Querying AI providers…"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {Object.entries(engineStatus.providers).map(([id, providerState]) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }} title={providerState.error || undefined}>
                <span style={{
                  flexShrink: 0,
                  width: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                }}>
                  {providerState.status === "searching" ? (
                    <span style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      border: "1.5px solid var(--accent)",
                      borderTopColor: "transparent",
                      display: "inline-block",
                      animation: "spin 0.65s linear infinite",
                    }} />
                  ) : providerState.status === "done" ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="#4ade80"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" /></svg>
                  ) : providerState.status === "failed" ? (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="#fc8181"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" /></svg>
                  ) : providerState.status === "rate_limited" ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="#f59e0b"><path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5A6.5 6.5 0 0 0 8 1.5zm.75 3v3.19l2.22 1.33-.75 1.23L7.25 8.5v-4z" /></svg>
                  ) : providerState.status === "unavailable" ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6.2 2.2v3.1" />
                      <path d="M9.8 2.2v3.1" />
                      <path d="M4.4 5.3h7.2a1.4 1.4 0 0 1 1.4 1.4v1.7a4.9 4.9 0 0 1-1.36 3.42L10.5 13" />
                      <path d="M5.5 13 4.36 11.82A4.9 4.9 0 0 1 3 8.4V6.7a1.4 1.4 0 0 1 1.4-1.4h2.1" />
                      <path d="m2.2 2.2 11.6 11.6" />
                    </svg>
                  ) : null}
                </span>
                <span style={{
                  fontSize: "0.8rem",
                  color:
                    providerState.status === "done"
                      ? "#4ade80"
                      : providerState.status === "failed"
                        ? "rgba(252,129,129,0.7)"
                        : providerState.status === "rate_limited"
                          ? "#f59e0b"
                          : providerState.status === "unavailable"
                            ? "rgba(148,163,184,0.78)"
                            : "var(--muted)",
                  fontWeight: providerState.status === "searching" ? 500 : 400,
                  transition: "color 200ms ease",
                }}>
                  {PROVIDER_LABELS[id] ?? id}
                </span>
              </div>
            ))}
          </div>

          {engineStatus.pass && (
            <div style={{
              marginTop: "0.9rem",
              paddingTop: "0.9rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border: "1.5px solid var(--accent)",
                borderTopColor: "transparent",
                display: "inline-block",
                animation: "spin 0.65s linear infinite",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                {engineStatus.pass === "quality" && "Quality check — reviewing for curriculum standards"}
                {engineStatus.pass === "alignment" && "Alignment pass — checking National Curriculum coverage"}
                {engineStatus.pass === "finalize" && "Finalising — applying UK spelling and filling any gaps"}
              </span>
            </div>
          )}
        </div>
      )}

      {uploadLessonOpen ? (
        <div className="scheduler-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !uploadLessonSaving) setUploadLessonOpen(false); }}>
          <div className="scheduler-modal">
            <button
              type="button"
              className="scheduler-modal-x"
              aria-label="Close"
              onClick={() => { if (!uploadLessonSaving) setUploadLessonOpen(false); }}
            >
              ×
            </button>
            <div>
              <span className="scheduler-modal-subject-chip">Upload your own lesson</span>
              <h2 className="scheduler-modal-title">Create a scheduled lesson with attachment</h2>
              <p className="scheduler-modal-date">Your file will be saved to Library Documents and linked to a timetable event.</p>
            </div>

            <form onSubmit={handleUploadOwnLesson} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div className="scheduler-modal-fields">
                <div className="scheduler-modal-field">
                  <label className="scheduler-modal-label">Year group</label>
                  <select
                    className="scheduler-modal-input"
                    value={uploadLessonDraft.yearGroup}
                    onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, yearGroup: e.target.value }))}
                  >
                    <option value="">Select year group…</option>
                    {YEAR_GROUPS.map((yg) => (
                      <option key={yg} value={yg}>{yg}</option>
                    ))}
                  </select>
                </div>
                <div className="scheduler-modal-field">
                  <label className="scheduler-modal-label">Subject</label>
                  <select
                    className="scheduler-modal-input"
                    value={uploadLessonDraft.subject}
                    onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, subject: e.target.value }))}
                  >
                    <option value="">Select subject…</option>
                    {SUBJECT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.subjects.map((subject) => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="scheduler-modal-field">
                <label className="scheduler-modal-label">Topic</label>
                <input
                  className="scheduler-modal-input"
                  value={uploadLessonDraft.topic}
                  onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g. Fractions, persuasive writing, rivers…"
                />
              </div>

              <div className="scheduler-modal-field">
                <label className="scheduler-modal-label">Lesson title</label>
                <input
                  className="scheduler-modal-input"
                  value={uploadLessonDraft.title}
                  onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Fractions lesson 3"
                />
              </div>

              <div className="scheduler-modal-field">
                <label className="scheduler-modal-label">Lesson file</label>
                <input
                  type="file"
                  className="scheduler-modal-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUploadLessonFile(file);
                    if (file && !uploadLessonDraft.title.trim()) {
                      setUploadLessonDraft((prev) => ({ ...prev, title: fileNameWithoutExtension(file.name) }));
                    }
                  }}
                />
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.77rem", color: "var(--muted)" }}>
                  {uploadLessonFile ? uploadLessonFile.name : "Choose a PDF, Word doc, slides deck, or other lesson file."}
                </p>
              </div>

              <div className="scheduler-modal-fields">
                <div className="scheduler-modal-field">
                  <label className="scheduler-modal-label">Date</label>
                  <input
                    type="date"
                    className="scheduler-modal-input"
                    value={uploadLessonDraft.scheduledDate}
                    onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                <div className="scheduler-modal-field">
                  <label className="scheduler-modal-label">Start time</label>
                  <input
                    type="time"
                    className="scheduler-modal-input"
                    value={uploadLessonDraft.startTime}
                    onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="scheduler-modal-field">
                  <label className="scheduler-modal-label">End time</label>
                  <input
                    type="time"
                    className="scheduler-modal-input"
                    value={uploadLessonDraft.endTime}
                    onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="scheduler-modal-field">
                <label className="scheduler-modal-label">Notes (optional)</label>
                <textarea
                  className="scheduler-modal-notes"
                  value={uploadLessonDraft.notes}
                  onChange={(e) => setUploadLessonDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Anything you want attached to this uploaded lesson event…"
                />
              </div>

              {uploadLessonError ? <p className="scheduler-modal-error">{uploadLessonError}</p> : null}

              <div className="scheduler-modal-actions">
                <button type="button" className="scheduler-modal-cancel" onClick={() => setUploadLessonOpen(false)} disabled={uploadLessonSaving}>
                  Cancel
                </button>
                <button type="submit" className="scheduler-modal-confirm" disabled={uploadLessonSaving}>
                  {uploadLessonSaving ? "Uploading…" : "Create event with attachment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Result ── */}
      {pack && (
        <div>
          {exportWarning && (
            <div className="auth-message is-error" style={{ marginBottom: "1rem" }}>
              <span className="auth-message-text">
                You have not reviewed this draft yet. {exportWarning.type === "export" ? "Export" : "Save"} anyway?
              </span>
              <div style={{ display: "flex", gap: "0.55rem", marginLeft: "auto", flexWrap: "wrap" }}>
                <button type="button" className="nav-btn-ghost" onClick={() => setExportWarning(null)} style={{ fontSize: "0.8rem", padding: "0.45rem 0.8rem" }}>
                  Review first
                </button>
                <button
                  type="button"
                  className="nav-btn-cta"
                  onClick={() => {
                    const action = exportWarning;
                    setExportWarning(null);
                    if (action.type === "export") {
                      void handleExport(action.format, true);
                    } else {
                      void handleManualSave(true);
                    }
                  }}
                  style={{ fontSize: "0.8rem", padding: "0.45rem 0.8rem" }}
                >
                  {exportWarning.type === "export" ? "Export draft" : "Save draft"}
                </button>
              </div>
            </div>
          )}

          {/* Pack header */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
            padding: "1.1rem 1.25rem",
            borderRadius: "16px",
            border: "1px solid var(--border-card)",
            background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.07) 0%, transparent 55%)",
            boxShadow: "0 4px 20px rgb(0 0 0 / 0.1), 0 1px 3px rgb(0 0 0 / 0.06)",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase" as const,
                  color: "var(--accent)",
                  padding: "0.18rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgb(var(--accent-rgb) / 0.13)",
                }}>{pack.year_group}</span>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase" as const,
                  color: "var(--orange)",
                  padding: "0.18rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgba(255, 159, 67, 0.13)",
                }}>{pack.subject}</span>
              </div>
              <h2 style={{
                margin: 0,
                fontSize: "1.3rem",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                lineHeight: 1.2,
              }}>{pack.topic}</h2>
              {pack._meta?.autoSaved && (
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.78rem", color: "#4ade80", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" /></svg>
                  Auto-saved to your library
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              {!pack._meta?.autoSaved && saveState !== "saved" && (
                <button
                  type="button"
                  onClick={() => void handleManualSave()}
                  disabled={saveState === "saving"}
                  className="nav-btn-ghost"
                  style={{ fontSize: "0.85rem", padding: "0.55rem 1rem", opacity: saveState === "saving" ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: "0.4rem", minHeight: "36px" }}
                >
                  {saveState === "saving" ? (
                    <>
                      <span style={{ width: "10px", height: "10px", border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.65s linear infinite" }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      Save to Library
                    </>
                  )}
                </button>
              )}
              {(pack._meta?.autoSaved || saveState === "saved") && (
                <span style={{ fontSize: "0.85rem", color: "#4ade80", padding: "0.55rem 0", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" /></svg>
                  Saved to library
                </span>
              )}
              {saveState === "error" && saveMsg && (
                <span style={{ fontSize: "0.82rem", color: "#fc8181", padding: "0.55rem 0" }}>{saveMsg}</span>
              )}
              <button
                type="button"
                onClick={() => handleExport("lesson-pdf")}
                className="nav-btn-ghost"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1rem", minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport("slides-pptx")}
                className="nav-btn-ghost"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1rem", minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                Export PPTX
              </button>
              <button
                type="button"
                onClick={() => handleExport("worksheet-doc")}
                className="nav-btn-ghost"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1rem", minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                Export Worksheet
              </button>
            </div>
          </div>

          {/* AI-generated notice */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
            padding: "0.6rem 0.9rem", borderRadius: "10px", marginBottom: "0.5rem",
            background: "rgb(var(--accent-rgb) / 0.06)", border: "1px solid rgb(var(--accent-rgb) / 0.2)",
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, color: "var(--accent)" }}>
              <path d="M8 0a.75.75 0 0 1 .712.513l1.33 3.986 3.987 1.33a.75.75 0 0 1 0 1.422l-3.986 1.33-1.33 3.987a.75.75 0 0 1-1.422 0L5.96 8.58 1.975 7.25a.75.75 0 0 1 0-1.422L5.96 4.498 7.29.512A.75.75 0 0 1 8 0z" />
            </svg>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", flex: 1 }}>
              <strong style={{ color: "var(--accent)" }}>AI-Generated content</strong> — This lesson pack was produced by an AI model.
              Always review and verify before using with pupils. You are responsible for its accuracy and suitability.
            </span>
          </div>

          {/* Class context mirror */}
          {pack && classProfile && (
            <div style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem",
              padding: "0.65rem 0.9rem", borderRadius: "10px", marginBottom: "0.5rem",
              background: "var(--field-bg)", border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--muted)", marginRight: "0.25rem" }}>
                Your class
              </span>
              {classProfile.ealPercent !== null && (
                <span style={{ fontSize: "0.73rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgb(99 102 241 / 0.1)", border: "1px solid rgb(99 102 241 / 0.25)", color: "var(--accent)" }}>
                  EAL {classProfile.ealPercent}%
                </span>
              )}
              {classProfile.pupilPremiumPercent !== null && (
                <span style={{ fontSize: "0.73rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgb(251 191 36 / 0.1)", border: "1px solid rgb(251 191 36 / 0.25)", color: "#f59e0b" }}>
                  PP {classProfile.pupilPremiumPercent}%
                </span>
              )}
              {classProfile.abilityMix && (
                <span style={{ fontSize: "0.73rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgb(148 163 184 / 0.1)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                  {classProfile.abilityMix === "mixed" ? "Mixed ability" : classProfile.abilityMix === "predominantly_lower" ? "Predominantly lower" : "Predominantly higher"}
                </span>
              )}
              {classProfile.sendFocus && (
                <span style={{ fontSize: "0.73rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgb(16 185 129 / 0.1)", border: "1px solid rgb(16 185 129 / 0.25)", color: "#10b981" }}>
                  SEND focus
                </span>
              )}
              {classProfile.classNotes && (
                <span style={{ fontSize: "0.73rem", color: "var(--muted)", fontStyle: "italic", marginLeft: "0.25rem" }}>
                  "{classProfile.classNotes.slice(0, 70)}{classProfile.classNotes.length > 70 ? "…" : ""}"
                </span>
              )}
            </div>
          )}

          {/* Class reflection prompts */}
          {pack && (reflectLoading || reflectQuestions.length > 0) && (
            <div className="card" style={{
              border: reflectionsComplete
                ? "1px solid rgb(74 222 128 / 0.35)"
                : "1.5px solid rgb(var(--accent-rgb) / 0.45)",
              marginBottom: "0.25rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <SectionLabel color={reflectionsComplete ? "#4ade80" : "var(--accent)"}>
                  {reflectionsComplete ? "Class reflection complete ✓" : "Review for your class"}
                </SectionLabel>
                {reflectQuestions.length > 0 && (
                  <span style={{
                    fontSize: "0.73rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: "999px",
                    background: reflectionsComplete ? "rgb(74 222 128 / 0.1)" : "rgb(var(--accent-rgb) / 0.1)",
                    border: `1px solid ${reflectionsComplete ? "rgb(74 222 128 / 0.3)" : "rgb(var(--accent-rgb) / 0.3)"}`,
                    color: reflectionsComplete ? "#4ade80" : "var(--accent)",
                  }}>
                    {Object.values(reflectAcknowledged).filter(Boolean).length} / {reflectQuestions.length} considered
                  </span>
                )}
              </div>

              {reflectLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", color: "var(--muted)", padding: "0.25rem 0" }}>
                  <span style={{
                    width: "14px", height: "14px", flexShrink: 0,
                    border: "2px solid var(--accent)", borderTopColor: "transparent",
                    borderRadius: "50%", display: "inline-block",
                    animation: "spin 0.65s linear infinite",
                  }} />
                  <span style={{ fontSize: "0.85rem" }}>Generating class-specific reflection prompts…</span>
                </div>
              )}

              {!reflectLoading && reflectQuestions.map((q, i) => {
                const acked = Boolean(reflectAcknowledged[i]);
                return (
                  <div key={i} style={{
                    display: "flex", gap: "0.85rem", alignItems: "flex-start",
                    padding: "0.8rem 0.9rem", borderRadius: "10px", marginBottom: "0.6rem",
                    background: acked ? "rgb(74 222 128 / 0.05)" : "var(--field-bg)",
                    border: `1px solid ${acked ? "rgb(74 222 128 / 0.3)" : "var(--border)"}`,
                    transition: "background 200ms ease, border-color 200ms ease",
                  }}>
                    <p style={{ flex: 1, margin: 0, fontSize: "0.88rem", lineHeight: 1.65, color: acked ? "var(--muted)" : "var(--text)" }}>
                      {q}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setReflectAcknowledged((prev) => ({ ...prev, [i]: !prev[i] }));
                        if (!acked) markReviewInteraction("lesson_pack_reflection_acknowledged", { index: i });
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "0.38rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 160ms ease",
                        border: acked ? "1px solid rgb(74 222 128 / 0.4)" : "1.5px solid rgb(var(--accent-rgb) / 0.5)",
                        background: acked ? "rgb(74 222 128 / 0.1)" : "rgb(var(--accent-rgb) / 0.08)",
                        color: acked ? "#4ade80" : "var(--accent)",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {acked ? "✓ Considered" : "Consider →"}
                    </button>
                  </div>
                );
              })}

              {!reflectLoading && !reflectionsComplete && reflectQuestions.length > 0 && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  Confirm each prompt to unlock save and export. This ensures you&apos;ve considered your pupils&apos; specific needs before using this lesson.
                </p>
              )}
            </div>
          )}

          {/* Sections */}
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="card">
              <SectionLabel>Teacher Review</SectionLabel>
              <p style={{ margin: "0 0 0.8rem", fontSize: "0.88rem", lineHeight: 1.65, color: "var(--text)" }}>
                This is a draft. Check assumptions before saving, exporting, or teaching from it.
              </p>
              <div style={{ display: "grid", gap: "0.85rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Built From</p>
                  <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.65, color: "var(--text)" }}>
                    {pack.year_group} · {pack.subject} · {pack.topic}
                    <br />
                    Curriculum objectives: {pack._meta?.usedCurriculumObjectives.length ? `${pack._meta.usedCurriculumObjectives.length} matched` : "AI-generated from topic context"}
                    <br />
                    Teacher profile: {pack._meta?.usedTeacherProfile ? "used" : "not used"}
                    <br />
                    Uploaded context: {pack._meta?.usedContextNotes ? "used" : "none"}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>AI Checks Run</p>
                  <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.65, color: "var(--text)" }}>
                    {(pack._meta?.passesRun ?? []).join(", ") || "quality, alignment, finalize"}
                  </p>
                  <p style={{ margin: "0.45rem 0 0", fontSize: "0.84rem", lineHeight: 1.6, color: "var(--muted)" }}>
                    Objectives clarity, differentiation, misconceptions, assessment progression, and curriculum fit were checked automatically.
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Confidence</p>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.84rem", fontWeight: 700, color: pack._meta?.confidence === "high" ? "#22c55e" : pack._meta?.confidence === "low" ? "#f59e0b" : "var(--accent)" }}>
                    {(pack._meta?.confidence ?? "medium").toUpperCase()}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text)" }}>
                    {pack._meta?.confidenceReason ?? "Review carefully before using in class."}
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Objectives */}
            <div className="card">
              <SectionLabel>Learning Objectives</SectionLabel>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {SECTION_REVIEW_OPTIONS.objectives.map((value) => reviewSectionButton("objectives", value))}
              </div>
              <ol style={{ margin: 0, padding: "0 0 0 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pack.learning_objectives.map((obj, i) => (
                  <li key={i} style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text)" }}>{obj}</li>
                ))}
              </ol>
            </div>

            {/* Teacher + Pupil explanations */}
            <div className="grid two" style={{ gap: "1rem" }}>
              <div className="card">
                <SectionLabel>Teacher Explanation</SectionLabel>
                <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)" }}>{pack.teacher_explanation}</p>
              </div>
              <div className="card">
                <SectionLabel color="#60a5fa">Pupil Explanation</SectionLabel>
                <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)" }}>{pack.pupil_explanation}</p>
              </div>
            </div>

            {/* Worked Example */}
            <div className="card">
              <SectionLabel color="var(--orange)">Worked Example</SectionLabel>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {SECTION_REVIEW_OPTIONS.worked_example.map((value) => reviewSectionButton("worked_example", value))}
              </div>
              <div style={{
                background: "var(--field-bg)",
                borderRadius: "10px",
                padding: "1rem 1.1rem",
                fontSize: "0.87rem",
                lineHeight: 1.75,
                color: "var(--text)",
                whiteSpace: "pre-wrap" as const,
                fontFamily: "inherit",
                border: "1px solid rgba(255, 159, 67, 0.18)",
              }}>{pack.worked_example}</div>
            </div>

            {/* Common Misconceptions */}
            <div className="card">
              <SectionLabel color="#fc8181">Common Misconceptions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {pack.common_misconceptions.map((m, i) => (
                  <div key={i} style={{
                    display: "flex",
                    gap: "0.7rem",
                    alignItems: "flex-start",
                    padding: "0.65rem 0.9rem",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.065)",
                    border: "1px solid rgba(239, 68, 68, 0.13)",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fc8181" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span style={{ fontSize: "0.87rem", lineHeight: 1.55, color: "var(--text)" }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Differentiated Activities */}
            <div className="card">
              <SectionLabel>Differentiated Activities</SectionLabel>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {SECTION_REVIEW_OPTIONS.activities.map((value) => reviewSectionButton("activities", value))}
              </div>
              <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {(["support", "expected", "greater_depth"] as const).map((key) => {
                  const meta = {
                    support: { label: "Support", color: "#4ade80", bg: "rgba(34,197,94,0.065)", border: "rgba(34,197,94,0.14)" },
                    expected: { label: "Expected", color: "var(--accent)", bg: "rgb(var(--accent-rgb) / 0.065)", border: "rgb(var(--accent-rgb) / 0.16)" },
                    greater_depth: { label: "Greater Depth", color: "var(--orange)", bg: "rgba(255,159,67,0.065)", border: "rgba(255,159,67,0.16)" },
                  }[key];
                  return (
                    <div key={key} style={{
                      padding: "0.9rem",
                      borderRadius: "12px",
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                    }}>
                      <div style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        color: meta.color,
                        marginBottom: "0.55rem",
                      }}>{meta.label}</div>
                      <p style={{ margin: 0, fontSize: "0.87rem", lineHeight: 1.65, color: "var(--text)" }}>
                        {pack.activities[key]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-Differentiation Panel */}
            {pack.differentiation && <DifferentiationPanel diff={pack.differentiation} />}

            {/* SEND Adaptations */}
            {pack.send_adaptations.length > 0 && (
              <div className="card">
                <SectionLabel color="#a78bfa">SEND Adaptations</SectionLabel>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {SECTION_REVIEW_OPTIONS.adaptations.map((value) => reviewSectionButton("adaptations", value))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {pack.send_adaptations.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="#a78bfa" style={{ flexShrink: 0, marginTop: "5px" }}>
                        <path d="M12 2L2 12l10 10 10-10L12 2z"/>
                      </svg>
                      <span style={{ fontSize: "0.87rem", lineHeight: 1.55, color: "var(--text)" }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pupil Plenary */}
            <div className="card">
              <SectionLabel>Pupil Plenary</SectionLabel>
              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text)" }}>{pack.plenary}</p>
            </div>

            <div className="card">
              <SectionLabel color="var(--muted)">Professional Check</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {[
                  "What would you keep as-is?",
                  "What would you adapt for this class?",
                  "What would you reject before teaching this lesson?",
                ].map((item) => (
                  <div key={item} style={{ padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--field-bg)", fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text)" }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Assessment */}
            <div className="card">
              <SectionLabel color="#4ade80">Mini Assessment</SectionLabel>
              {pack.mini_assessment.questions.map((q, i) => (
                <RevealItem
                  key={i}
                  question={q}
                  answer={pack.mini_assessment.answers[i] ?? ""}
                  index={i}
                />
              ))}
            </div>

            {/* Slides */}
            {pack.slides.length > 0 && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <SectionLabel>Presentation Slides</SectionLabel>
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "999px",
                    background: "rgb(var(--accent-rgb) / 0.12)",
                    color: "var(--accent)",
                    fontWeight: 600,
                    marginBottom: "0.85rem",
                  }}>{pack.slides.length} slides</span>
                </div>
                <div style={{
                  display: "flex",
                  gap: "0.75rem",
                  overflowX: "auto",
                  paddingBottom: "0.5rem",
                  scrollbarWidth: "thin" as const,
                }}>
                  {pack.slides.map((slide, i) => (
                    <SlideCard key={i} slide={slide} index={i} />
                  ))}
                </div>
              </div>
            )}

          </div>{/* /sections */}

          {/* Export result — removed: exports now trigger direct downloads */}
          {exportResult && false && (
            <div className="card" style={{ marginTop: "1.25rem" }}>
              <SectionLabel color="var(--muted)">Export Result</SectionLabel>
              <pre style={{
                margin: 0,
                fontSize: "0.77rem",
                color: "var(--muted)",
                overflowX: "auto",
                background: "var(--field-bg)",
                borderRadius: "8px",
                padding: "0.75rem",
                lineHeight: 1.55,
              }}>{JSON.stringify(exportResult, null, 2)}</pre>
            </div>
          )}

          {/* Feedback & regenerate */}
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <SectionLabel color="var(--muted)">Request Changes</SectionLabel>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Challenge the draft before regenerating. Pick a review focus, then add any teacher-specific guidance below.
            </p>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {GUIDED_REVIEW_PROMPTS.map((label) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => toggleGuidedFeedback(label)}
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    borderRadius: "999px",
                    cursor: "pointer",
                    padding: "0.34rem 0.72rem",
                    border: guidedFeedback.includes(label) ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: guidedFeedback.includes(label) ? "rgb(var(--accent-rgb) / 0.12)" : "transparent",
                    color: guidedFeedback.includes(label) ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (e.target.value.trim()) {
                  markReviewInteraction("lesson_pack_review_opened", { source: "textarea" });
                }
              }}
              placeholder="e.g. The activities are too similar — make the greater depth task more open-ended…"
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box" as const,
                resize: "vertical" as const,
                border: "1px solid var(--border)",
                background: "var(--field-bg)",
                color: "var(--text)",
                borderRadius: "10px",
                padding: "0.65rem 0.75rem",
                fontSize: "0.88rem",
                fontFamily: "inherit",
                lineHeight: 1.6,
                outline: "none",
                marginBottom: "0.75rem",
              }}
            />
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={!buildFeedbackPayload() || regenLoading}
              className="nav-btn-cta"
              style={{
                padding: "0.65rem 1.25rem",
                fontSize: "0.88rem",
                borderRadius: "10px",
                opacity: (!buildFeedbackPayload() || regenLoading) ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {regenLoading ? (
                <>
                  <span style={{
                    width: "12px",
                    height: "12px",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.65s linear infinite",
                    flexShrink: 0,
                  }} />
                  Regenerating…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 .49-3.9"/>
                  </svg>
                  Regenerate with feedback
                </>
              )}
            </button>
          </div>

        </div>
      )}{/* /pack */}

    </main>
  );
}
