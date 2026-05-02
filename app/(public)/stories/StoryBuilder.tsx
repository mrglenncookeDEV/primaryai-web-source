"use client";

import { useState, useEffect, useRef } from "react";
import type { Priority, Effort, UserStory } from "@/types/user-stories";
import styles from "./StoryBuilder.module.css";
import GuideDrawer from "./GuideDrawer";

// ── Static data ──────────────────────────────────────────────────────────────

const STEPS = ["Who", "What", "Why & Priority", "Acceptance Criteria", "Review & Save"];

const WHO_CHIPS = [
  "Teacher",
  "Teaching Assistant",
  "Subject Lead",
  "SENCO",
  "Head Teacher",
  "School Admin Staff",
];

const WHAT_CHIPS = [
  "create lesson plans",
  "track pupil progress",
  "generate teaching resources",
  "plan a unit of work",
  "save and reuse materials",
  "share work with colleagues",
  "export progress reports",
  "differentiate learning activities",
  "set and mark homework",
  "manage parent communications",
];

const WHY_CHIPS = [
  "save time on planning",
  "improve pupil outcomes",
  "meet curriculum requirements",
  "support SEND pupils",
  "reduce marking workload",
  "keep pupil records up to date",
  "collaborate with other staff",
  "meet Ofsted requirements",
  "support early career teachers",
];

const MOSCOW: { value: Priority; label: string; desc: string; color: string }[] = [
  { value: "must",   label: "Must have",    desc: "Critical — launch cannot proceed without this", color: "#ef4444" },
  { value: "should", label: "Should have",  desc: "Important but not vital for launch",            color: "#f97316" },
  { value: "could",  label: "Could have",   desc: "Desirable but low impact if left out",          color: "#3b82f6" },
  { value: "wont",   label: "Won't have",   desc: "Out of scope for this release",                 color: "#6b7280" },
];

const EFFORT_CHIPS: Effort[] = ["Small", "Medium", "Large", "Not sure"];

const PRIORITY_COLORS: Record<string, string> = {
  must: "#ef4444", should: "#f97316", could: "#3b82f6", wont: "#6b7280",
};

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4;

interface BuilderState {
  step: Step;
  who: string;
  what: string;
  why: string;
  priority: Priority | null;
  priorityLabel: string;
  effort: Effort | "";
  ac: string[];
  notes: string;
  saving: boolean;
  savedRef: string | null;
  error: string | null;
}

const INITIAL: BuilderState = {
  step: 0, who: "", what: "", why: "",
  priority: null, priorityLabel: "", effort: "",
  ac: [""], notes: "",
  saving: false, savedRef: null, error: null,
};

type DrawerMode = "view" | "edit" | "guide";

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  initialStories: UserStory[];
}

export default function StoryBuilder({ initialStories }: Props) {
  const [state, setState] = useState<BuilderState>(INITIAL);
  const [stories, setStories] = useState<UserStory[]>(initialStories);
  const [drawerStory, setDrawerStory] = useState<UserStory | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [showGuide, setShowGuide] = useState(false);
  const [newStoryId, setNewStoryId] = useState<string | null>(null);
  const backlogRef = useRef<HTMLDivElement>(null);

  function set(patch: Partial<BuilderState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function goTo(step: Step) { set({ step, error: null }); }
  function handleBack() { if (state.step > 0) goTo((state.step - 1) as Step); }

  function handleNext() {
    const { step, who, what, why } = state;
    if (step === 0 && !who.trim()) return set({ error: "Please select or enter a role." });
    if (step === 1 && !what.trim()) return set({ error: "Please select or describe what they want to do." });
    if (step === 2 && !why.trim()) return set({ error: "Please select or describe the benefit." });
    goTo((step + 1) as Step);
  }

  function updateAc(idx: number, value: string) {
    const ac = [...state.ac]; ac[idx] = value; set({ ac });
  }
  function addAc() { set({ ac: [...state.ac, ""] }); }
  function removeAc(idx: number) {
    const ac = state.ac.filter((_, i) => i !== idx);
    set({ ac: ac.length ? ac : [""] });
  }

  async function handleSave() {
    const { who, what, why, priority, priorityLabel, effort, ac, notes } = state;
    if (!who.trim() || !what.trim() || !why.trim()) {
      return set({ error: "Please complete all required fields before saving." });
    }
    set({ saving: true, error: null });
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          who: who.trim(), what: what.trim(), why: why.trim(),
          priority: priority ?? undefined,
          priority_label: priorityLabel || undefined,
          effort: effort || undefined,
          acceptance_criteria: ac.filter((c) => c.trim()),
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        set({ saving: false, error: json.error ?? "Something went wrong. Please try again." });
        return;
      }
      const newStory: UserStory = json.story;
      setStories((s) => [newStory, ...s]);
      setNewStoryId(newStory.id);
      setTimeout(() => setNewStoryId(null), 4000);
      set({ ...INITIAL, savedRef: newStory.story_ref });
    } catch {
      set({ saving: false, error: "Network error — please check your connection and try again." });
    }
  }

  function openDrawer(story: UserStory, mode: DrawerMode = "view") {
    setShowGuide(false);
    setDrawerStory(story);
    setDrawerMode(mode);
  }

  function closeDrawer() {
    setDrawerStory(null);
    setDrawerMode("view");
    setShowGuide(false);
  }

  function openGuide() {
    setDrawerStory(null);
    setShowGuide(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this story? This cannot be undone.")) return;
    setStories((s) => s.filter((st) => st.id !== id));
    if (drawerStory?.id === id) closeDrawer();
    await fetch(`/api/stories/${id}`, { method: "DELETE" });
  }

  async function handleSaveEdit(updated: UserStory) {
    const { id, who, what, why, priority, priority_label, effort, acceptance_criteria, notes } = updated;
    try {
      const res = await fetch(`/api/stories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who, what, why, priority, priority_label, effort, acceptance_criteria, notes }),
      });
      const json = await res.json();
      if (!res.ok) return;
      const saved: UserStory = json.story ?? updated;
      setStories((s) => s.map((st) => st.id === saved.id ? saved : st));
      setDrawerStory(saved);
      setDrawerMode("view");
    } catch {
      // silent — user can retry
    }
  }

  // Scroll to backlog when save succeeds
  useEffect(() => {
    if (state.savedRef && backlogRef.current) {
      setTimeout(() => {
        backlogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [state.savedRef]);

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { step, who, what, why, priority, effort, ac, notes, saving, error } = state;

  return (
    <div className={styles.page}>
<div className={styles.header}>
        <h1>PrimaryAI Story Builder</h1>
        <p>Help shape PrimaryAI by describing how teachers would use it — in your own words.</p>
        <button type="button" className={styles.guideBtn} onClick={openGuide}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          User Guide
        </button>
      </div>

      {/* ── Wizard card ── */}
      <div className={styles.card}>
        {state.savedRef ? (
          /* ── Success panel ── */
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Story saved!</h2>
            <div className={styles.successRef}>{state.savedRef}</div>
            <p className={styles.successMsg}>Added to the backlog below.</p>
            <button className={styles.btnPrimary} onClick={() => setState(INITIAL)}>
              Add another story
            </button>
          </div>
        ) : (
          <>
            {/* Step tracker */}
            <div className={styles.steps}>
              {STEPS.map((label, i) => (
                <StepItem key={i} index={i} label={label} currentStep={step} totalSteps={STEPS.length} />
              ))}
            </div>

            {/* ── Step 0: Who ── */}
            {step === 0 && (
              <div className={styles.stepContent}>
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Who is the user?</p>
                  <p className={styles.sectionHint}>Pick a role from the quick-selects, or describe the exact person below.</p>
                  <div className={styles.chips}>
                    {WHO_CHIPS.map((c) => (
                      <button key={c} type="button"
                        className={`${styles.chip}${who === c ? " " + styles.chipSelected : ""}`}
                        onClick={() => set({ who: c, error: null })}>{c}</button>
                    ))}
                  </div>
                  <input className={styles.input} type="text"
                    placeholder="e.g. Year 3 class teacher with a mixed-ability cohort of 28 pupils…"
                    value={who} onChange={(e) => set({ who: e.target.value, error: null })} />
                  <div className={styles.tipBox}>
                    <span className={styles.tipIcon}>💡</span>
                    <p className={styles.tipText}>
                      <strong>Be specific.</strong> Instead of just "Teacher", try{" "}
                      <em>"Year 3 class teacher covering a mixed-ability cohort"</em> or{" "}
                      <em>"NQT in their first year of primary teaching"</em>.
                      The more specific the role, the more useful the story when it comes to design decisions.
                    </p>
                  </div>
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
                <div className={styles.navBtns}>
                  <span className={styles.btnSpacer} />
                  <button className={styles.btnPrimary} type="button" onClick={handleNext}>Next →</button>
                </div>
              </div>
            )}

            {/* ── Step 1: What ── */}
            {step === 1 && (
              <div className={styles.stepContent}>
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>What do they want to do?</p>
                  <p className={styles.sectionHint}>Pick a common goal or describe the exact task in your own words.</p>
                  <div className={styles.chips}>
                    {WHAT_CHIPS.map((c) => (
                      <button key={c} type="button"
                        className={`${styles.chip}${what === c ? " " + styles.chipSelected : ""}`}
                        onClick={() => set({ what: c, error: null })}>{c}</button>
                    ))}
                  </div>
                  <input className={styles.input} type="text"
                    placeholder="e.g. automatically generate a differentiated lesson plan for three ability groups in under 2 minutes…"
                    value={what} onChange={(e) => set({ what: e.target.value, error: null })} />
                  <div className={styles.tipBox}>
                    <span className={styles.tipIcon}>💡</span>
                    <p className={styles.tipText}>
                      <strong>Describe the action, not the feature.</strong> Instead of "use AI", try{" "}
                      <em>"automatically generate a differentiated worksheet for three ability groups"</em>.
                      Focus on what the user actually does, not what the system provides — that part is for the engineers.
                    </p>
                  </div>
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
                <div className={styles.navBtns}>
                  <button className={styles.btnSecondary} type="button" onClick={handleBack}>← Back</button>
                  <button className={styles.btnPrimary} type="button" onClick={handleNext}>Next →</button>
                </div>
              </div>
            )}

            {/* ── Step 2: Why & Priority ── */}
            {step === 2 && (
              <div className={styles.stepContent}>
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Why do they need this?</p>
                  <p className={styles.sectionHint}>Pick a benefit or quantify the real impact in your own words.</p>
                  <div className={styles.chips}>
                    {WHY_CHIPS.map((c) => (
                      <button key={c} type="button"
                        className={`${styles.chip}${why === c ? " " + styles.chipSelected : ""}`}
                        onClick={() => set({ why: c, error: null })}>{c}</button>
                    ))}
                  </div>
                  <input className={styles.input} type="text"
                    placeholder="e.g. reduce weekly planning from 4 hours to under 1 hour so I can focus on my pupils…"
                    value={why} onChange={(e) => set({ why: e.target.value, error: null })} />
                  <div className={styles.tipBox}>
                    <span className={styles.tipIcon}>💡</span>
                    <p className={styles.tipText}>
                      <strong>Quantify where you can.</strong> Instead of "save time", try{" "}
                      <em>"reduce weekly planning from 4 hours to under 1 hour"</em>.
                      A measurable benefit makes the story far easier to prioritise and verify once it is built.
                    </p>
                  </div>
                </div>
                <div className={styles.section}>
                  <span className={styles.fieldLabel}>MoSCoW Priority</span>
                  <div className={styles.moscowGrid}>
                    {MOSCOW.map((m) => (
                      <button key={m.value} type="button" className={styles.moscowCard}
                        style={{
                          borderColor: priority === m.value ? m.color : undefined,
                          background: priority === m.value ? `color-mix(in srgb, ${m.color} 12%, transparent)` : undefined,
                          color: priority === m.value ? m.color : undefined,
                        }}
                        onClick={() => set({ priority: m.value, priorityLabel: m.label, error: null })}>
                        <span className={styles.moscowTitle}>{m.label}</span>
                        <span className={styles.moscowDesc}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.section}>
                  <span className={styles.fieldLabel}>Effort estimate</span>
                  <div className={styles.effortChips}>
                    {EFFORT_CHIPS.map((e) => (
                      <button key={e} type="button"
                        className={`${styles.chip}${effort === e ? " " + styles.chipSelected : ""}`}
                        onClick={() => set({ effort: e, error: null })}>{e}</button>
                    ))}
                  </div>
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
                <div className={styles.navBtns}>
                  <button className={styles.btnSecondary} type="button" onClick={handleBack}>← Back</button>
                  <button className={styles.btnPrimary} type="button" onClick={handleNext}>Next →</button>
                </div>
              </div>
            )}

            {/* ── Step 3: AC ── */}
            {step === 3 && (
              <div className={styles.stepContent}>
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Acceptance criteria</p>
                  <p className={styles.sectionHint}>
                    List the conditions that must be true for this story to be done. Optional but highly recommended.
                  </p>
                  <div className={styles.tipBox} style={{ marginBottom: "1.125rem", marginTop: 0 }}>
                    <span className={styles.tipIcon}>💡</span>
                    <p className={styles.tipText}>
                      <strong>Write testable conditions.</strong> Each criterion should be something you can verify.
                      Good examples: <em>"The user can export the plan as a PDF in one click"</em>,{" "}
                      <em>"The generated plan covers all five learning objectives"</em>,{" "}
                      <em>"Page loads in under 3 seconds on a standard school network"</em>.
                      Aim for 3–5 criteria per story.
                    </p>
                  </div>
                  <div className={styles.acList}>
                    {ac.map((criterion, i) => (
                      <div key={i} className={styles.acRow}>
                        <span className={styles.acIndex}>{i + 1}.</span>
                        <input className={styles.input} type="text" placeholder={`Criterion ${i + 1}…`}
                          value={criterion} onChange={(e) => updateAc(i, e.target.value)} />
                        {ac.length > 1 && (
                          <button type="button" className={styles.acRemove}
                            aria-label="Remove" onClick={() => removeAc(i)}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" className={styles.addAcBtn} onClick={addAc}>+ Add criterion</button>
                </div>
                <div className={styles.section}>
                  <span className={styles.fieldLabel}>Notes (optional)</span>
                  <textarea className={styles.textarea} rows={4}
                    placeholder="e.g. Consider SEND requirements, offline access for rural schools, safeguarding constraints, or any edge cases the team should know about…"
                    value={notes} onChange={(e) => set({ notes: e.target.value })} />
                </div>
                <div className={styles.navBtns}>
                  <button className={styles.btnSecondary} type="button" onClick={handleBack}>← Back</button>
                  <button className={styles.btnPrimary} type="button" onClick={handleNext}>Review →</button>
                </div>
              </div>
            )}

            {/* ── Step 4: Review & Save ── */}
            {step === 4 && (
              <div className={styles.stepContent}>
                <div className={styles.section}>
                  <p className={styles.sectionTitle}>Review your story</p>
                  <p className={styles.sectionHint}>Check everything looks right before saving to the backlog.</p>
                </div>
                <div className={styles.preview}>
                  <p className={styles.previewRef}>Draft — not yet saved</p>
                  <p className={styles.storyText}>
                    As a <strong>{who || "…"}</strong>, I want to{" "}
                    <em>{what || "…"}</em>, so that <em>{why || "…"}</em>.
                  </p>
                  {(priority || effort) && (
                    <div className={styles.badges}>
                      {priority && (
                        <span className={styles.badge} style={{
                          background: `color-mix(in srgb, ${MOSCOW.find((m) => m.value === priority)?.color ?? "#888"} 15%, transparent)`,
                          color: MOSCOW.find((m) => m.value === priority)?.color ?? "#888",
                        }}>{state.priorityLabel}</span>
                      )}
                      {effort && (
                        <span className={styles.badge} style={{ background: "var(--btn-bg)", color: "var(--muted)" }}>
                          {effort}
                        </span>
                      )}
                    </div>
                  )}
                  {ac.filter((c) => c.trim()).length > 0 && (
                    <div className={styles.acPreviewSection}>
                      <p className={styles.acPreviewTitle}>Acceptance criteria</p>
                      <ul className={styles.acPreviewList}>
                        {ac.filter((c) => c.trim()).map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                  {notes.trim() && (
                    <div className={styles.notesSection}><strong>Notes:</strong> {notes}</div>
                  )}
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
                <div className={styles.navBtns}>
                  <button className={styles.btnSecondary} type="button" onClick={handleBack}>← Back</button>
                  <button className={styles.btnPrimary} type="button" onClick={handleSave} disabled={saving}>
                    {saving && <span className={styles.spinner} />}
                    {saving ? "Saving…" : "Save to backlog"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Backlog list ── */}
      {stories.length > 0 && (
        <div className={styles.backlog} ref={backlogRef}>
          <div className={styles.backlogHeader}>
            <h2 className={styles.backlogTitle}>Story Backlog</h2>
            <span className={styles.backlogCount}>
              {stories.length} {stories.length === 1 ? "story" : "stories"}
            </span>
          </div>
          <div className={styles.storyList}>
            {stories.map((story, i) => (
              <div
                key={story.id}
                className={`${styles.storyRow}${story.id === newStoryId ? " " + styles.storyRowNew : ""}`}
                style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
              >
                <button
                  type="button"
                  className={styles.rowTextBtn}
                  onClick={() => openDrawer(story, "view")}
                >
                  <span className={styles.rowRef}>{story.story_ref}</span>
                  <span className={styles.rowText}>
                    As a <strong>{story.who}</strong>, I want to {story.what}, so that {story.why}.
                  </span>
                  <span className={styles.rowMeta}>
                    {story.priority && (
                      <span className={styles.rowBadge} style={{
                        background: `color-mix(in srgb, ${PRIORITY_COLORS[story.priority]} 15%, transparent)`,
                        color: PRIORITY_COLORS[story.priority],
                      }}>{story.priority_label}</span>
                    )}
                    {story.effort && (
                      <span className={styles.rowBadge} style={{ background: "var(--btn-bg)", color: "var(--muted)" }}>
                        {story.effort}
                      </span>
                    )}
                    <span className={styles.rowDate}>
                      {new Date(story.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </span>
                  <span className={styles.rowChevron} aria-hidden="true">›</span>
                </button>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.rowActionBtn}
                    onClick={() => openDrawer(story, "edit")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowActionBtn} ${styles.rowDeleteBtn}`}
                    onClick={() => handleDelete(story.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Drawer ── */}
      {(drawerStory || showGuide) && (
        <>
          <div className={styles.drawerBackdrop} onClick={closeDrawer} aria-hidden="true" />
          <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={showGuide ? "User Guide" : "Story detail"}>
            {showGuide ? (
              <GuideDrawer onClose={closeDrawer} />
            ) : drawerStory ? (
              <StoryDrawer
                story={drawerStory}
                mode={drawerMode}
                onClose={closeDrawer}
                onSwitchToEdit={() => setDrawerMode("edit")}
                onCancelEdit={() => setDrawerMode("view")}
                onSave={handleSaveEdit}
                onDelete={handleDelete}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// ── Story drawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  story: UserStory;
  mode: DrawerMode;
  onClose: () => void;
  onSwitchToEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updated: UserStory) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function StoryDrawer({ story, mode, onClose, onSwitchToEdit, onCancelEdit, onSave, onDelete }: DrawerProps) {
  const color = PRIORITY_COLORS[story.priority ?? ""] ?? null;
  const moscowEntry = MOSCOW.find((m) => m.value === story.priority);

  // Edit form state — reset when story or mode changes
  const [editWho, setEditWho] = useState(story.who);
  const [editWhat, setEditWhat] = useState(story.what);
  const [editWhy, setEditWhy] = useState(story.why);
  const [editPriority, setEditPriority] = useState<Priority | null>(story.priority ?? null);
  const [editPriorityLabel, setEditPriorityLabel] = useState(story.priority_label ?? "");
  const [editEffort, setEditEffort] = useState<Effort | "">(story.effort ?? "");
  const [editAc, setEditAc] = useState<string[]>(story.acceptance_criteria.length ? story.acceptance_criteria : [""]);
  const [editNotes, setEditNotes] = useState(story.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setEditWho(story.who);
    setEditWhat(story.what);
    setEditWhy(story.why);
    setEditPriority(story.priority ?? null);
    setEditPriorityLabel(story.priority_label ?? "");
    setEditEffort(story.effort ?? "");
    setEditAc(story.acceptance_criteria.length ? story.acceptance_criteria : [""]);
    setEditNotes(story.notes ?? "");
    setSaving(false);
    setEditError(null);
  }, [story.id, mode]);

  function updateEditAc(i: number, v: string) {
    const a = [...editAc]; a[i] = v; setEditAc(a);
  }
  function addEditAc() { setEditAc([...editAc, ""]); }
  function removeEditAc(i: number) {
    const a = editAc.filter((_, idx) => idx !== i);
    setEditAc(a.length ? a : [""]);
  }

  async function handleSubmitEdit() {
    if (!editWho.trim() || !editWhat.trim() || !editWhy.trim()) {
      setEditError("Who, What, and Why are required.");
      return;
    }
    setSaving(true);
    setEditError(null);
    await onSave({
      ...story,
      who: editWho.trim(),
      what: editWhat.trim(),
      why: editWhy.trim(),
      priority: editPriority,
      priority_label: editPriorityLabel || null,
      effort: editEffort || null,
      acceptance_criteria: editAc.filter((c) => c.trim()),
      notes: editNotes.trim() || null,
    });
    setSaving(false);
  }

  if (mode === "edit") {
    return (
      <div className={styles.drawerInner}>
        <div className={styles.drawerTopBar}>
          <button className={styles.drawerClose} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className={styles.drawerRef}>{story.story_ref}</span>
          <span className={styles.drawerEditBadge}>Editing</span>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.drawerEditForm}>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>Who</label>
              <input className={styles.input} value={editWho} onChange={(e) => setEditWho(e.target.value)} placeholder="e.g. Year 3 class teacher…" />
            </div>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>What</label>
              <input className={styles.input} value={editWhat} onChange={(e) => setEditWhat(e.target.value)} placeholder="e.g. generate differentiated worksheets…" />
            </div>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>Why</label>
              <input className={styles.input} value={editWhy} onChange={(e) => setEditWhy(e.target.value)} placeholder="e.g. reduce weekly planning time…" />
            </div>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>Priority</label>
              <div className={styles.drawerEditPriority}>
                {MOSCOW.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={styles.drawerPriorityChip}
                    style={{
                      borderColor: editPriority === m.value ? m.color : undefined,
                      background: editPriority === m.value ? `color-mix(in srgb, ${m.color} 12%, transparent)` : undefined,
                      color: editPriority === m.value ? m.color : undefined,
                    }}
                    onClick={() => { setEditPriority(m.value); setEditPriorityLabel(m.label); }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>Effort</label>
              <div className={styles.drawerEffortChips}>
                {EFFORT_CHIPS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`${styles.chip}${editEffort === e ? " " + styles.chipSelected : ""}`}
                    onClick={() => setEditEffort(e)}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>Acceptance criteria</label>
              <div className={styles.drawerAcEditList}>
                {editAc.map((c, i) => (
                  <div key={i} className={styles.drawerAcEditRow}>
                    <span className={styles.drawerAcEditIndex}>{i + 1}.</span>
                    <input className={styles.input} value={c} onChange={(e) => updateEditAc(i, e.target.value)} placeholder={`Criterion ${i + 1}…`} />
                    {editAc.length > 1 && (
                      <button type="button" className={styles.drawerAcEditRemove} aria-label="Remove" onClick={() => removeEditAc(i)}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className={styles.drawerAddAcBtn} onClick={addEditAc}>+ Add criterion</button>
            </div>
            <div className={styles.drawerEditRow}>
              <label className={styles.fieldLabel}>Notes</label>
              <textarea className={styles.textarea} rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Any additional context…" />
            </div>
            {editError && <p className={styles.errorMsg}>{editError}</p>}
          </div>
        </div>

        <div className={styles.drawerEditFooter}>
          <div className={styles.drawerFooterBtns}>
            <button className={styles.btnSecondary} type="button" onClick={onCancelEdit}>
              Cancel
            </button>
            <button className={styles.btnPrimary} type="button" onClick={handleSubmitEdit} disabled={saving}>
              {saving && <span className={styles.spinner} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className={styles.drawerInner}>
      <div className={styles.drawerTopBar}>
        <button className={styles.drawerClose} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className={styles.drawerRef}>{story.story_ref}</span>
        <button className={styles.drawerEditToggle} onClick={onSwitchToEdit}>Edit</button>
      </div>

      <div className={styles.drawerBody}>
        {/* Story sentence */}
        <div className={styles.drawerStoryBlock}>
          <blockquote className={styles.drawerQuote}>
            As a <strong>{story.who}</strong>,<br />
            I want to <em>{story.what}</em>,<br />
            so that <em>{story.why}</em>.
          </blockquote>
        </div>

        {/* Badges */}
        {(story.priority || story.effort) && (
          <div className={styles.drawerBadges}>
            {color && moscowEntry && (
              <span className={styles.drawerBadge} style={{
                background: `color-mix(in srgb, ${color} 18%, transparent)`,
                color,
                borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
              }}>
                <span className={styles.drawerBadgeDot} style={{ background: color }} />
                {story.priority_label}
              </span>
            )}
            {story.effort && (
              <span className={styles.drawerBadge} style={{
                background: "var(--btn-bg)",
                color: "var(--muted)",
                borderColor: "var(--border)",
              }}>
                {story.effort} effort
              </span>
            )}
          </div>
        )}

        {/* Acceptance criteria */}
        {story.acceptance_criteria.length > 0 && (
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Acceptance Criteria</h3>
            <ol className={styles.drawerAcList}>
              {story.acceptance_criteria.map((c, i) => (
                <li key={i} className={styles.drawerAcItem}>
                  <span className={styles.drawerAcNum}>{i + 1}</span>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Notes */}
        {story.notes && (
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Notes</h3>
            <p className={styles.drawerNotes}>{story.notes}</p>
          </div>
        )}

        {/* Meta */}
        <div className={styles.drawerMeta}>
          <span>Created {new Date(story.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          {story.created_by && <span>by {story.created_by}</span>}
        </div>
      </div>

      {/* Delete footer */}
      <div className={styles.drawerEditFooter}>
        <div className={styles.drawerFooterBtns}>
          <button
            className={`${styles.rowActionBtn} ${styles.rowDeleteBtn}`}
            type="button"
            onClick={() => onDelete(story.id)}
          >
            Delete story
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step item ─────────────────────────────────────────────────────────────────

function StepItem({ index, label, currentStep, totalSteps }: {
  index: number; label: string; currentStep: number; totalSteps: number;
}) {
  const done = index < currentStep;
  const active = index === currentStep;
  const isLast = index === totalSteps - 1;
  return (
    <>
      <div className={styles.stepItem}>
        <span className={`${styles.stepNum}${active ? " " + styles.active : ""}${done ? " " + styles.done : ""}`}>
          {done ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : index + 1}
        </span>
        <span className={styles.stepLabel}>{label}</span>
      </div>
      {!isLast && <div className={`${styles.stepConnector}${done ? " " + styles.done : ""}`} />}
    </>
  );
}
