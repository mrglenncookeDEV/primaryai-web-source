"use client";

import { useEffect, useMemo, useState } from "react";

type LessonSection = { title: string; purpose: string; goodLooksLike: string; prompt: string };
type LessonStructure = { id: string; name: string; description?: string | null; sections: LessonSection[] };
type UnitPlan = {
  id: string;
  title: string;
  year_group: string;
  subject: string;
  term?: string | null;
  unit_summary?: string | null;
  vocabulary?: Array<Record<string, string>>;
  progression?: Array<Record<string, string>>;
};
type Pupil = {
  id: string;
  pseudonym: string;
  year_group?: string | null;
  home_languages?: string[];
  eal_stage?: string | null;
  send_needs?: string[];
  attainment?: string | null;
  reading_age?: string | null;
  interests?: string | null;
  current_next_step?: string | null;
};
type ThinkingQuestion = { stem: string; type: string; bloom_level: string };

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
  thinking_questions?: ThinkingQuestion[];
  send_adaptations: string[];
  lesson_sections?: Array<{
    title: string;
    content: string;
    teacher_prompts?: string[];
    checks_for_understanding?: string[];
    rationale_badge?: string;
  }>;
  next_steps?: Array<{ pupil: string; next_step: string; lesson_response?: string }>;
  rationale_tags?: Array<{ decision: string; source: string; note: string }>;
  plenary: string;
  mini_assessment: { questions: string[]; answers: string[] };
  slides: Array<{ title: string; bullets: string[]; speaker_notes?: string }>;
  _meta?: { confidence?: string; confidenceReason?: string };
};

const YEAR_GROUPS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const SUBJECTS = ["Maths", "English", "Science", "History", "Geography", "Art and Design", "Design and Technology", "Music", "Computing", "PE", "PSHE", "RE", "French", "Spanish", "German", "Mandarin"];

const DEFAULT_STRUCTURE_TEXT = [
  "Retrieval practice / daily review|Reactivate prior knowledge and reveal gaps.|Pupils answer short, targeted questions linked to prior knowledge.|What do pupils need to remember before today's learning can make sense?",
  "Our learning journey|Locate today's lesson in the unit sequence.|Pupils can explain where this learning fits and why it matters.|What have pupils already learned, and what comes next?",
  "Learning objective|Make the intended learning precise and assessable.|The objective describes what pupils will know or do by the end.|What is the smallest meaningful learning step for this lesson?",
  "Vocabulary pre-teach / check|Remove language barriers before new content.|Key words are defined, rehearsed, and used in context.|Which words will block understanding if they are not taught first?",
  "New learning|Teach and model the new concept explicitly.|The teacher models the thinking, checks understanding, and corrects misconceptions.|What exact explanation, model, or representation will move pupils forward?",
  "I do, we do, you do|Move from modelled practice to guided and independent application.|Pupils practise with decreasing support and clear success criteria.|How will support be faded without leaving pupils guessing?",
  "Proof-reading|Build accuracy and independent checking habits.|Pupils check a small, relevant part of their work against a clear criterion.|What should pupils check before they think they are finished?",
  "Oracy / talking point / big question|Use talk to deepen reasoning and reveal misconceptions.|Pupils explain, justify, challenge, or build on ideas using sentence stems.|What question will force pupils to reason aloud?",
  "Review|Gather evidence of learning and set up the next lesson.|The teacher can see who is secure, who needs more practice, and what to do next.|What evidence will show whether today's learning landed?",
].join("\n");

function splitLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parseStructure(text: string): LessonSection[] {
  return splitLines(text).map((line) => {
    const [title, purpose = "", goodLooksLike = "", prompt = ""] = line.split("|").map((part) => part.trim());
    return { title, purpose, goodLooksLike, prompt };
  }).filter((section) => section.title);
}

function parseVocabulary(text: string) {
  return splitLines(text).map((line) => {
    const [tier = "", term = "", definition = ""] = line.split("|").map((part) => part.trim());
    return { tier, term, definition };
  }).filter((item) => item.term || item.definition);
}

function parseProgression(text: string) {
  return splitLines(text).map((line) => {
    const [objective = "", prerequisite = ""] = line.split("|").map((part) => part.trim());
    return { objective, prerequisite };
  }).filter((item) => item.objective);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CriticalPlannerPage() {
  const [activeTab, setActiveTab] = useState<"knowledge" | "pupils" | "plan">("plan");
  const [structures, setStructures] = useState<LessonStructure[]>([]);
  const [units, setUnits] = useState<UnitPlan[]>([]);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSchool, setNoSchool] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [structureName, setStructureName] = useState("School foundation lesson structure");
  const [structureText, setStructureText] = useState(DEFAULT_STRUCTURE_TEXT);

  const [unitDraft, setUnitDraft] = useState({
    yearGroup: "Year 4",
    subject: "History",
    title: "Romans",
    term: "",
    unitSummary: "",
    experiences: "",
    endPoints: "",
    vocabularyText: "tier 3|empire|A group of countries or lands ruled by one powerful country or ruler",
    progressionText: "Explain why the Roman army was successful|Know that the Roman Empire expanded across Europe",
  });

  const [pupilDraft, setPupilDraft] = useState({
    pseudonym: "Child A",
    yearGroup: "Year 4",
    homeLanguages: "",
    ealStage: "",
    sendNeeds: "",
    attainment: "",
    readingAge: "",
    interests: "",
    currentNextStep: "",
    notes: "",
  });

  const [planDraft, setPlanDraft] = useState({
    yearGroup: "Year 4",
    subject: "History",
    topic: "Romans",
    unitId: "none",
    lessonStructureId: "default",
    sequencePosition: "Lesson 1 of 6",
    lastLessonAfl: "",
    adjustments: "",
    quickPlan: false,
  });
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [draftContext, setDraftContext] = useState("");

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    const [structureRes, unitRes, pupilRes] = await Promise.all([
      fetch("/api/school/lesson-structures", { cache: "no-store" }),
      fetch("/api/school/units", { cache: "no-store" }),
      fetch("/api/school/pupils", { cache: "no-store" }),
    ]);
    const [structureData, unitData, pupilData] = await Promise.all([
      structureRes.json().catch(() => ({})),
      unitRes.json().catch(() => ({})),
      pupilRes.json().catch(() => ({})),
    ]);
    if (structureRes.ok) setStructures(structureData.structures ?? []);
    if (unitRes.ok) setUnits(unitData.units ?? []);
    if (pupilRes.ok) setPupils(pupilData.pupils ?? []);
    if (!structureRes.ok && structureRes.status === 409) setNoSchool(true);
    setLoading(false);
  }

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => unit.year_group === planDraft.yearGroup && unit.subject === planDraft.subject);
  }, [planDraft.subject, planDraft.yearGroup, units]);

  const focusPupils = useMemo(() => {
    return pupils.filter((pupil) => focusIds.includes(pupil.id));
  }, [focusIds, pupils]);

  async function saveStructure() {
    setError(""); setMessage("");
    const res = await fetch("/api/school/lesson-structures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: structureName,
        source: "custom",
        sections: parseStructure(structureText),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data?.error || "Could not save structure"); return; }
    setMessage("Lesson structure saved.");
    await loadAll();
  }

  async function saveUnit() {
    setError(""); setMessage("");
    const res = await fetch("/api/school/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...unitDraft,
        vocabulary: parseVocabulary(unitDraft.vocabularyText),
        progression: parseProgression(unitDraft.progressionText),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data?.error || "Could not save unit"); return; }
    setMessage("Unit plan saved.");
    await loadAll();
  }

  async function savePupil() {
    setError(""); setMessage("");
    const res = await fetch("/api/school/pupils", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pupilDraft),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data?.error || "Could not save pupil profile"); return; }
    setMessage("Pupil planning profile saved.");
    setPupilDraft((prev) => ({ ...prev, pseudonym: "", currentNextStep: "", notes: "" }));
    await loadAll();
  }

  async function generateCriticalLesson() {
    setError(""); setMessage(""); setPack(null); setDraftContext("");
    if (!planDraft.lastLessonAfl.trim()) {
      setError("Please fill in 'What happened last lesson?' — this is required to generate a critically tailored lesson.");
      return;
    }
    if (!planDraft.quickPlan && focusPupils.some((pupil) => !String(nextSteps[pupil.id] || "").trim())) {
      setError("Every selected focus pupil needs a next step before generation.");
      return;
    }
    setGenerating(true);
    try {
      const draftRes = await fetch("/api/planning/critical-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...planDraft,
          focusPupils: focusPupils.map((pupil) => ({
            id: pupil.id,
            pseudonym: pupil.pseudonym,
            needs: [
              pupil.attainment,
              pupil.eal_stage ? `EAL: ${pupil.eal_stage}` : "",
              pupil.home_languages?.length ? `Home languages: ${pupil.home_languages.join(", ")}` : "",
              pupil.send_needs?.length ? `SEND: ${pupil.send_needs.join(", ")}` : "",
              pupil.reading_age ? `Reading age: ${pupil.reading_age}` : "",
              pupil.interests ? `Interests: ${pupil.interests}` : "",
            ].filter(Boolean).join(" | "),
            nextStep: nextSteps[pupil.id] || pupil.current_next_step || "",
          })),
        }),
      });
      const draftData = await draftRes.json().catch(() => ({}));
      if (!draftRes.ok) throw new Error(draftData?.error || "Could not create critical planning draft");
      setDraftContext(draftData.contextNotes || "");

      const lessonRes = await fetch("/api/lesson-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year_group: planDraft.yearGroup,
          subject: planDraft.subject,
          topic: planDraft.topic,
          context_notes: draftData.contextNotes,
          forceSave: false,
        }),
      });
      const lessonData = await lessonRes.json().catch(() => ({}));
      if (!lessonRes.ok) throw new Error(lessonData?.error || "Lesson generation failed");
      setPack(lessonData);
      setMessage(planDraft.quickPlan ? "Quick plan generated. Review carefully before using." : "Critical lesson generated with required next steps.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate lesson");
    } finally {
      setGenerating(false);
    }
  }

  async function exportPack(format: "lesson-pdf" | "slides-pptx" | "worksheet-doc") {
    if (!pack) return;
    const res = await fetch("/api/lesson-pack/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, pack }),
    });
    if (!res.ok) { setError("Export failed"); return; }
    const blob = await res.blob();
    const ext = format === "lesson-pdf" ? "pdf" : format === "slides-pptx" ? "pptx" : "doc";
    downloadBlob(blob, `${pack.subject}-${pack.topic}.${ext}`);
  }

  const field: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: "9px",
    background: "var(--field-bg)",
    color: "var(--text)",
    padding: "0.55rem 0.7rem",
    fontFamily: "inherit",
    fontSize: "0.86rem",
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em" };
  const card: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface)", padding: "1rem" };
  const button: React.CSSProperties = { border: "none", borderRadius: "9px", background: "var(--accent)", color: "white", padding: "0.55rem 1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

  if (loading) return <main className="page-wrap" style={{ maxWidth: 920 }}><p style={{ color: "var(--muted)" }}>Loading critical planner…</p></main>;

  if (noSchool) return (
    <main className="page-wrap" style={{ maxWidth: 600 }}>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.55rem", fontWeight: 800 }}>Critical Planner</h1>
      <div style={{ marginTop: "1.5rem", padding: "1.5rem", borderRadius: "14px", border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.07)" }}>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "#f59e0b" }}>School account required</p>
        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text)" }}>
          Critical Planner uses your school&apos;s lesson structure, unit plans, and pseudonymous pupil profiles to generate lessons that are genuinely tailored to your class. You need to create or join a school first.
        </p>
        <a href="/school" style={{ display: "inline-block", padding: "0.55rem 1.1rem", borderRadius: "9px", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", textDecoration: "none" }}>
          Set up school account →
        </a>
      </div>
    </main>
  );

  return (
    <main className="page-wrap" style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: "1.4rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.55rem", fontWeight: 800 }}>Critical Planner</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Plan from school structure, unit knowledge, AfL and required pupil next steps before generating.
        </p>
      </div>

      {(error || message) && (
        <div style={{ ...card, marginBottom: "1rem", borderColor: error ? "#ef4444" : "#22c55e", color: error ? "#ef4444" : "#16a34a" }}>
          {error || message}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.45rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          ["plan", "Plan lesson"],
          ["knowledge", "School knowledge"],
          ["pupils", "Pupil profiles"],
        ].map(([id, text]) => (
          <button key={id} type="button" onClick={() => setActiveTab(id as any)} style={{
            ...button,
            background: activeTab === id ? "var(--accent)" : "var(--surface)",
            color: activeTab === id ? "white" : "var(--text)",
            border: activeTab === id ? "none" : "1px solid var(--border)",
          }}>{text}</button>
        ))}
      </div>

      {activeTab === "knowledge" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <section style={card}>
            <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem" }}>Lesson structure</h2>
            <label style={label}>Structure name</label>
            <input value={structureName} onChange={(e) => setStructureName(e.target.value)} style={field} />
            <label style={{ ...label, marginTop: "0.8rem" }}>Sections: title | purpose | what good looks like | teacher prompt</label>
            <textarea value={structureText} onChange={(e) => setStructureText(e.target.value)} rows={12} style={field} />
            <button type="button" onClick={saveStructure} style={{ ...button, marginTop: "0.8rem" }}>Save structure</button>
            <p style={{ margin: "0.8rem 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>{structures.length} structure{structures.length === 1 ? "" : "s"} available.</p>
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem" }}>Unit plan</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
              <div><label style={label}>Year</label><select value={unitDraft.yearGroup} onChange={(e) => setUnitDraft((p) => ({ ...p, yearGroup: e.target.value }))} style={field}>{YEAR_GROUPS.map((y) => <option key={y}>{y}</option>)}</select></div>
              <div><label style={label}>Subject</label><select value={unitDraft.subject} onChange={(e) => setUnitDraft((p) => ({ ...p, subject: e.target.value }))} style={field}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <label style={{ ...label, marginTop: "0.7rem" }}>Unit title</label>
            <input value={unitDraft.title} onChange={(e) => setUnitDraft((p) => ({ ...p, title: e.target.value }))} style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>Summary</label>
            <textarea value={unitDraft.unitSummary} onChange={(e) => setUnitDraft((p) => ({ ...p, unitSummary: e.target.value }))} rows={3} style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>Vocabulary: tier | term | child-friendly definition</label>
            <textarea value={unitDraft.vocabularyText} onChange={(e) => setUnitDraft((p) => ({ ...p, vocabularyText: e.target.value }))} rows={4} style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>Progression: objective | prerequisite</label>
            <textarea value={unitDraft.progressionText} onChange={(e) => setUnitDraft((p) => ({ ...p, progressionText: e.target.value }))} rows={4} style={field} />
            <button type="button" onClick={saveUnit} style={{ ...button, marginTop: "0.8rem" }}>Save unit</button>
            <p style={{ margin: "0.8rem 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>{units.length} unit{units.length === 1 ? "" : "s"} available.</p>
          </section>
        </div>
      )}

      {activeTab === "pupils" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) 1.1fr", gap: "1rem" }}>
          <section style={card}>
            <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem" }}>Add pseudonymous profile</h2>
            <label style={label}>Pseudonym</label>
            <input value={pupilDraft.pseudonym} onChange={(e) => setPupilDraft((p) => ({ ...p, pseudonym: e.target.value }))} placeholder="Child A, Pupil 04" style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>Home languages</label>
            <input value={pupilDraft.homeLanguages} onChange={(e) => setPupilDraft((p) => ({ ...p, homeLanguages: e.target.value }))} placeholder="Urdu, Polish" style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>SEND needs</label>
            <input value={pupilDraft.sendNeeds} onChange={(e) => setPupilDraft((p) => ({ ...p, sendNeeds: e.target.value }))} placeholder="ASD, fine motor" style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>Attainment / reading age</label>
            <input value={pupilDraft.attainment} onChange={(e) => setPupilDraft((p) => ({ ...p, attainment: e.target.value }))} placeholder="Below ARE in writing" style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>Current next step</label>
            <textarea value={pupilDraft.currentNextStep} onChange={(e) => setPupilDraft((p) => ({ ...p, currentNextStep: e.target.value }))} rows={3} style={field} />
            <button type="button" onClick={savePupil} style={{ ...button, marginTop: "0.8rem" }}>Save pupil profile</button>
          </section>
          <section style={card}>
            <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem" }}>Current profiles</h2>
            <div style={{ display: "grid", gap: "0.55rem" }}>
              {pupils.length === 0 && <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.86rem" }}>No pupil profiles yet.</p>}
              {pupils.map((pupil) => (
                <div key={pupil.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem" }}>
                  <p style={{ margin: "0 0 0.2rem", fontWeight: 800 }}>{pupil.pseudonym}</p>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>
                    {[pupil.attainment, pupil.eal_stage, ...(pupil.send_needs ?? [])].filter(Boolean).join(" · ") || "No tags"}
                  </p>
                  {pupil.current_next_step && <p style={{ margin: "0.45rem 0 0", fontSize: "0.84rem" }}>{pupil.current_next_step}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "plan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <section style={card}>
            <h2 style={{ margin: "0 0 0.8rem", fontSize: "1rem" }}>Planning conversation</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
              <div><label style={label}>Year</label><select value={planDraft.yearGroup} onChange={(e) => setPlanDraft((p) => ({ ...p, yearGroup: e.target.value, unitId: "none" }))} style={field}>{YEAR_GROUPS.map((y) => <option key={y}>{y}</option>)}</select></div>
              <div><label style={label}>Subject</label><select value={planDraft.subject} onChange={(e) => setPlanDraft((p) => ({ ...p, subject: e.target.value, unitId: "none" }))} style={field}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <label style={{ ...label, marginTop: "0.7rem" }}>Unit / topic</label>
            <input value={planDraft.topic} onChange={(e) => setPlanDraft((p) => ({ ...p, topic: e.target.value }))} style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>School unit</label>
            <select value={planDraft.unitId} onChange={(e) => setPlanDraft((p) => ({ ...p, unitId: e.target.value }))} style={field}>
              <option value="none">No school unit selected</option>
              {filteredUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
            </select>
            <label style={{ ...label, marginTop: "0.7rem" }}>Lesson structure</label>
            <select value={planDraft.lessonStructureId} onChange={(e) => setPlanDraft((p) => ({ ...p, lessonStructureId: e.target.value }))} style={field}>
              {structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}
            </select>
            <label style={{ ...label, marginTop: "0.7rem" }}>Which lesson in the sequence?</label>
            <input value={planDraft.sequencePosition} onChange={(e) => setPlanDraft((p) => ({ ...p, sequencePosition: e.target.value }))} style={field} />
            <label style={{ ...label, marginTop: "0.7rem" }}>
              What happened last lesson? AfL evidence
              <span style={{ color: "#ef4444", marginLeft: "0.25rem" }}>*</span>
            </label>
            <textarea value={planDraft.lastLessonAfl} onChange={(e) => setPlanDraft((p) => ({ ...p, lastLessonAfl: e.target.value }))} rows={4} style={{ ...field, borderColor: !planDraft.lastLessonAfl.trim() ? "rgba(239,68,68,0.4)" : undefined }} placeholder="e.g. Most pupils secure on X. Child A struggled with Y. Child B ready to extend to Z." />
            <label style={{ ...label, marginTop: "0.7rem" }}>Adjustments today</label>
            <textarea value={planDraft.adjustments} onChange={(e) => setPlanDraft((p) => ({ ...p, adjustments: e.target.value }))} rows={2} style={field} />
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.8rem", fontSize: "0.84rem" }}>
              <input type="checkbox" checked={planDraft.quickPlan} onChange={(e) => setPlanDraft((p) => ({ ...p, quickPlan: e.target.checked }))} />
              Quick plan: generate without pupil next steps. This is generic and must be tailored.
            </label>
            {!planDraft.quickPlan && pupils.length > 0 && (
              <>
                <div style={{ borderTop: "1px solid var(--border)", margin: "1rem 0" }} />
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>Required pupil next steps</h3>
              </>
            )}
            {!planDraft.quickPlan && pupils.length === 0 && (
              <p style={{ margin: "1rem 0 0", padding: "0.75rem 1rem", borderRadius: "10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#f59e0b", fontSize: "0.86rem" }}>
                No pupil profiles yet. <button type="button" onClick={() => setActiveTab("pupils")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>Add pupil profiles</button> or enable Quick plan below.
              </p>
            )}
            {planDraft.quickPlan && <p style={{ margin: "1rem 0 0", color: "#f59e0b", fontSize: "0.86rem" }}>Quick plan skips the forced next-step gate and produces a less tailored lesson.</p>}
            {!planDraft.quickPlan && (
              <div style={{ display: "grid", gap: "0.6rem" }}>
                {pupils.map((pupil) => {
                  const selected = focusIds.includes(pupil.id);
                  return (
                    <div key={pupil.id} style={{ border: selected ? "1.5px solid var(--accent)" : "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem" }}>
                      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => setFocusIds((prev) => e.target.checked ? [...prev, pupil.id] : prev.filter((id) => id !== pupil.id))}
                        />
                        {pupil.pseudonym}
                      </label>
                      <p style={{ margin: "0.3rem 0", color: "var(--muted)", fontSize: "0.78rem" }}>{[pupil.attainment, ...(pupil.send_needs ?? [])].filter(Boolean).join(" · ") || "No profile tags"}</p>
                      {selected && (
                        <>
                          <label style={label}>Required next step</label>
                          <textarea
                            value={nextSteps[pupil.id] ?? pupil.current_next_step ?? ""}
                            onChange={(e) => setNextSteps((prev) => ({ ...prev, [pupil.id]: e.target.value }))}
                            rows={3}
                            style={field}
                            placeholder="What must this pupil do next to be successful?"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <button type="button" onClick={generateCriticalLesson} disabled={generating} style={{ ...button, marginTop: "1rem", width: "100%", opacity: generating ? 0.65 : 1 }}>
              {generating ? "Generating…" : "Generate critical lesson"}
            </button>
          </section>

          {pack && (
            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.2rem" }}>{pack.subject}: {pack.topic}</h2>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.84rem" }}>{pack.year_group} · {pack._meta?.confidence ?? "medium"} confidence</p>
                </div>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => exportPack("lesson-pdf")} style={button}>PDF</button>
                  <button type="button" onClick={() => exportPack("slides-pptx")} style={button}>PPTX</button>
                  <button type="button" onClick={() => exportPack("worksheet-doc")} style={button}>Worksheet</button>
                </div>
              </div>
              {pack.thinking_questions && pack.thinking_questions.length > 0 && (
                <div style={{ marginTop: "1rem", border: "1.5px solid #10b981", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#10b981" }}>Critical Thinking Questions — Bloom&apos;s Framework</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 0 }}>
                    {pack.thinking_questions.map((q, i) => (
                      <div key={i} style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 6px", borderRadius: "5px", background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{q.bloom_level}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{q.type}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.55, fontWeight: 500, color: "var(--text)" }}>{q.stem}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                <article><h3>Learning objectives</h3><ul>{pack.learning_objectives.map((item, i) => <li key={i}>{item}</li>)}</ul></article>
                <article><h3>Next steps</h3>{pack.next_steps?.length ? <ul>{pack.next_steps.map((item, i) => <li key={i}><strong>{item.pupil}:</strong> {item.next_step}{item.lesson_response ? ` - ${item.lesson_response}` : ""}</li>)}</ul> : <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.78rem", color: "var(--muted)", maxHeight: 220, overflow: "auto" }}>{draftContext.split("FOCUS PUPILS AND REQUIRED NEXT STEPS")[1]?.split("OUTPUT REQUIREMENTS")[0]?.trim() || "No next-step context."}</pre>}</article>
                {pack.lesson_sections?.length ? (
                  <article style={{ gridColumn: "1 / -1" }}>
                    <h3>School lesson structure</h3>
                    <div style={{ display: "grid", gap: "0.65rem" }}>
                      {pack.lesson_sections.map((section, i) => (
                        <div key={`${section.title}-${i}`} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.8rem" }}>
                          <p style={{ margin: "0 0 0.35rem", fontWeight: 800 }}>{i + 1}. {section.title}</p>
                          <p style={{ margin: 0 }}>{section.content}</p>
                          {section.rationale_badge && <p style={{ margin: "0.45rem 0 0", color: "var(--accent)", fontSize: "0.78rem", fontWeight: 700 }}>{section.rationale_badge}</p>}
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
                <article><h3>Teacher explanation</h3><p>{pack.teacher_explanation}</p></article>
                <article><h3>SEND / EAL adaptations</h3><ul>{pack.send_adaptations.map((item, i) => <li key={i}>{item}</li>)}</ul></article>
                <article><h3>Activities</h3><p><strong>Support:</strong> {pack.activities.support}</p><p><strong>Expected:</strong> {pack.activities.expected}</p><p><strong>Greater depth:</strong> {pack.activities.greater_depth}</p></article>
                <article><h3>Reasoning badges</h3>{pack.rationale_tags?.length ? <ul>{pack.rationale_tags.map((item, i) => <li key={i}><strong>{item.source}:</strong> {item.decision} {item.note ? `- ${item.note}` : ""}</li>)}</ul> : <ul><li>School structure context included</li><li>Unit knowledge context included where selected</li><li>Class profile gate enforced by generator</li><li>Evidence citations are currently marked as pending source-library implementation</li></ul>}</article>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
