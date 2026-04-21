import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { DEFAULT_LESSON_SECTIONS, getSchoolContext } from "@/lib/school-planning";

type FocusPupil = {
  id?: string;
  pseudonym: string;
  needs?: string;
  nextStep?: string;
};

function text(value: unknown, max = 3000) {
  return String(value || "").trim().slice(0, max);
}

function formatList(items: unknown, render: (item: any, index: number) => string) {
  if (!Array.isArray(items) || items.length === 0) return "- None specified";
  return items.map(render).join("\n");
}

function buildContext(args: {
  quickPlan: boolean;
  yearGroup: string;
  subject: string;
  topic: string;
  sequencePosition: string;
  lastLessonAfl: string;
  adjustments: string;
  unit: any;
  structure: any;
  focusPupils: FocusPupil[];
}) {
  const sections = Array.isArray(args.structure?.sections) && args.structure.sections.length
    ? args.structure.sections
    : DEFAULT_LESSON_SECTIONS;
  const vocabulary = Array.isArray(args.unit?.vocabulary) ? args.unit.vocabulary : [];
  const progression = Array.isArray(args.unit?.progression) ? args.unit.progression : [];

  return [
    "CRITICAL PLANNING CONTEXT",
    args.quickPlan
      ? "Planning mode: QUICK PLAN. Warn the teacher that this is less tailored because required child-level next steps were skipped. Keep adaptations generic and clearly label them for teacher review."
      : "Planning mode: FULL CRITICAL PLAN. Do not produce a generic lesson. Use the school, unit, class and next-step evidence below.",
    "",
    "LESSON",
    `- Year group: ${args.yearGroup}`,
    `- Subject: ${args.subject}`,
    `- Unit/topic: ${args.topic}`,
    `- Sequence position: ${args.sequencePosition || "Not specified"}`,
    `- Last lesson AfL: ${args.lastLessonAfl}`,
    `- Practical adjustments: ${args.adjustments || "None specified"}`,
    "",
    "SCHOOL LESSON STRUCTURE - generate the lesson in these sections and use this language",
    formatList(sections, (section, index) =>
      `${index + 1}. ${section.title}\n   Purpose: ${section.purpose || "Not specified"}\n   What good looks like: ${section.goodLooksLike || section.good_looks_like || "Not specified"}\n   Teacher prompt: ${section.prompt || "Not specified"}`,
    ),
    "",
    "UNIT KNOWLEDGE",
    `- Unit summary: ${args.unit?.unit_summary || args.unit?.unitSummary || "Not specified"}`,
    `- Experiences wanted: ${args.unit?.experiences || "Not specified"}`,
    `- End points: ${args.unit?.end_points || args.unit?.endPoints || "Not specified"}`,
    "Vocabulary:",
    formatList(vocabulary, (item) =>
      `- ${item.term || item.word || item.text || "Vocabulary"}${item.tier ? ` (${item.tier})` : ""}: ${item.definition || item.childFriendlyDefinition || item.child_friendly_definition || ""}`,
    ),
    "Progression:",
    formatList(progression, (item) =>
      `- ${item.objective || item.text || item.description || "Objective"}${item.prerequisite ? ` | prerequisite: ${item.prerequisite}` : ""}`,
    ),
    "",
    "FOCUS PUPILS AND REQUIRED NEXT STEPS",
    formatList(args.focusPupils, (pupil) =>
      `- ${pupil.pseudonym}: needs/context: ${pupil.needs || "not specified"} | required next step: ${pupil.nextStep || "not specified"}`,
    ),
    "",
    "OUTPUT REQUIREMENTS",
    "- Populate each school lesson-structure section explicitly.",
    "- Include a dedicated next-steps block using the focus pupils above.",
    "- Include teacher prompts and checks for understanding in each relevant section.",
    "- Mark rationales as: School structure, Unit knowledge, Class profile, or AI suggestion pending evidence.",
    "- Keep pseudonyms exactly as provided; do not invent real pupil names.",
  ].join("\n");
}

export async function POST(req: Request) {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const yearGroup = text(body?.yearGroup || body?.year_group, 40);
  const subject = text(body?.subject, 80);
  const topic = text(body?.topic, 180);
  const lastLessonAfl = text(body?.lastLessonAfl || body?.last_lesson_afl, 2500);
  const sequencePosition = text(body?.sequencePosition || body?.sequence_position, 240);
  const adjustments = text(body?.adjustments, 2000);
  const quickPlan = body?.quickPlan === true || body?.quick_plan === true;
  const focusPupils: FocusPupil[] = Array.isArray(body?.focusPupils || body?.focus_pupils)
    ? (body?.focusPupils || body?.focus_pupils).map((p: any) => ({
      id: p?.id ? String(p.id) : undefined,
      pseudonym: text(p?.pseudonym, 80),
      needs: text(p?.needs, 1200),
      nextStep: text(p?.nextStep || p?.next_step, 1200),
    })).filter((p: FocusPupil) => p.pseudonym)
    : [];

  if (!yearGroup || !subject || !topic || !lastLessonAfl) {
    return NextResponse.json({ error: "Year group, subject, topic and last lesson AfL are required" }, { status: 400 });
  }
  if (!quickPlan && focusPupils.length === 0) {
    return NextResponse.json({ error: "Add at least one focus pupil, or choose quick plan." }, { status: 400 });
  }
  if (!quickPlan && focusPupils.some((p) => !p.nextStep)) {
    return NextResponse.json({ error: "Every focus pupil needs a next step before generation." }, { status: 400 });
  }

  let unit: any = null;
  const unitId = text(body?.unitId || body?.unit_id, 80);
  if (unitId && unitId !== "none") {
    const { data } = await supabase
      .from("school_unit_plans")
      .select("*")
      .eq("id", unitId)
      .maybeSingle();
    unit = data ?? null;
  }

  let structure: any = null;
  const lessonStructureId = text(body?.lessonStructureId || body?.lesson_structure_id, 80);
  if (lessonStructureId && lessonStructureId !== "default") {
    const { data } = await supabase
      .from("school_lesson_structures")
      .select("*")
      .eq("id", lessonStructureId)
      .maybeSingle();
    structure = data ?? null;
  }
  if (!structure) {
    structure = { id: "default", sections: DEFAULT_LESSON_SECTIONS };
  }

  const generatedContext = buildContext({
    quickPlan,
    yearGroup,
    subject,
    topic,
    sequencePosition,
    lastLessonAfl,
    adjustments,
    unit,
    structure,
    focusPupils,
  });

  const { data, error } = await supabase
    .from("critical_planning_drafts")
    .insert({
      user_id: ctx.userId,
      school_id: ctx.schoolId,
      unit_id: unit?.id ?? null,
      lesson_structure_id: structure?.id === "default" ? null : structure?.id ?? null,
      year_group: yearGroup,
      subject,
      topic,
      sequence_position: sequencePosition || null,
      last_lesson_afl: lastLessonAfl,
      adjustments: adjustments || null,
      focus_pupils: focusPupils,
      next_steps: focusPupils.map((p) => ({ pseudonym: p.pseudonym, nextStep: p.nextStep })),
      quick_plan: quickPlan,
      generated_context: generatedContext,
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not save planning draft" }, { status: 503 });

  for (const pupil of focusPupils) {
    if (!pupil.id || !pupil.nextStep) continue;
    await supabase
      .from("class_pupil_profiles")
      .update({ current_next_step: pupil.nextStep, updated_at: new Date().toISOString() })
      .eq("id", pupil.id)
      .eq("user_id", ctx.userId);
  }

  return NextResponse.json({ ok: true, draft: data, contextNotes: generatedContext }, { status: 201 });
}
