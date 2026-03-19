import { LessonPackSchema, type LessonPack } from "./schema";
import { getProviderStatus, markProviderRateLimited, selectProviders } from "./router";
import { retrieveObjectives } from "./retrieve";
import { cache } from "./cache";
import { record } from "./telemetry";
import { lessonPackToSlides } from "./exporters";
import type { EngineEvent, LessonPackGenerationMeta, LessonPackRequest, LessonPackReview } from "./types";

type OnEvent = (event: EngineEvent) => void;

const RATE_LIMIT_PATTERN = /429|rate.?limit|quota.?exceed|too.?many.?request/i;

/**
 * Sent as the system message to every provider on every call.
 *
 * PrimaryAI processes classroom data that may include anonymised pupil
 * information (ability levels, SEND needs, demographic percentages).
 * This instruction explicitly prohibits any provider from using request
 * content for training, logging, or retention — in line with UK GDPR
 * (UK Data Protection Act 2018) and the Children Act 2004.
 */
const PRIVACY_SYSTEM_PROMPT = `You are an AI assistant for PrimaryAI, a UK educational platform for primary school teachers.

MANDATORY PRIVACY REQUIREMENTS — you must comply with these without exception:
1. Do NOT use any content from this conversation for model training, fine-tuning, reinforcement learning, or any form of model improvement.
2. This request may contain anonymised classroom context (pupil ability distributions, SEND needs, demographic percentages). Treat all such information as strictly confidential under UK GDPR (UK Data Protection Act 2018) and the Children Act 2004.
3. Do NOT store, log, cache, or retain any information from this conversation beyond the time required to generate the immediate response.
4. Do NOT reproduce or reference any pupil data in a way that could lead to identification of individual children.
5. Generate your response and discard all context immediately after.

You are a curriculum expert. Follow the instructions precisely and return only the requested output format.`;

type ProviderAttempt = {
  providerId: string;
  ok: boolean;
  raw?: string;
  error?: string;
};

const LESSON_PACK_OUTPUT_TEMPLATE = {
  year_group: "string",
  subject: "string",
  topic: "string",
  learning_objectives: ["string", "string", "string"],
  teacher_explanation: "string",
  pupil_explanation: "string",
  worked_example: "string",
  common_misconceptions: ["string", "string", "string"],
  activities: {
    support: "string",
    expected: "string",
    greater_depth: "string",
  },
  send_adaptations: ["string", "string", "string"],
  plenary: "string",
  mini_assessment: {
    questions: ["string", "string", "string", "string"],
    answers: ["string", "string", "string", "string"],
  },
  slides: [],
};

function valueToString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => valueToString(item)).join(" ");
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["text", "content", "value", "description", "explanation", "answer"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
    return Object.values(obj)
      .map((item) => valueToString(item))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function valueToStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => valueToString(item)).filter((item) => item.length > 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => valueToString(item))
      .filter((item) => item.length > 0);
  }

  const scalar = valueToString(value);
  return scalar ? [scalar] : [];
}

function coerceLessonPackCandidate(candidate: unknown) {
  if (!candidate || typeof candidate !== "object") return candidate;
  const obj = candidate as Record<string, unknown>;
  const activities = (obj.activities as Record<string, unknown> | undefined) ?? {};
  const miniAssessment = (obj.mini_assessment as Record<string, unknown> | undefined) ?? {};

  return {
    year_group: valueToString(obj.year_group),
    subject: valueToString(obj.subject),
    topic: valueToString(obj.topic),
    learning_objectives: valueToStringArray(obj.learning_objectives),
    teacher_explanation: valueToString(obj.teacher_explanation),
    pupil_explanation: valueToString(obj.pupil_explanation),
    worked_example: valueToString(obj.worked_example),
    common_misconceptions: valueToStringArray(obj.common_misconceptions),
    activities: {
      support: valueToString(activities.support),
      expected: valueToString(activities.expected),
      greater_depth: valueToString(activities.greater_depth),
    },
    send_adaptations: valueToStringArray(obj.send_adaptations),
    plenary: valueToString(obj.plenary),
    mini_assessment: {
      questions: valueToStringArray(miniAssessment.questions),
      answers: valueToStringArray(miniAssessment.answers),
    },
    slides: [],
  };
}

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }

    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("Could not find JSON object in provider output");
    return JSON.parse(objectMatch[0]);
  }
}

function normalizeProviderOutput(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw == null) throw new Error("Provider returned empty output");
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

async function runProviderAttempt(
  provider: { id: string; generate: (prompt: string, systemPrompt?: string) => Promise<unknown> },
  prompt: string,
  onEvent?: OnEvent,
) {
  const timeoutMs = Number(process.env.ENGINE_PROVIDER_TIMEOUT_MS ?? 25000);
  const maxAttempts = Number(process.env.ENGINE_PROVIDER_MAX_ATTEMPTS ?? 2);

  onEvent?.({ type: "provider_start", id: provider.id });

  let lastError = "Unknown provider failure";

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const output = await withTimeout(provider.generate(prompt, PRIVACY_SYSTEM_PROMPT), timeoutMs);
      onEvent?.({ type: "provider_done", id: provider.id, ok: true });
      return {
        providerId: provider.id,
        ok: true,
        raw: normalizeProviderOutput(output),
      } as ProviderAttempt;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (RATE_LIMIT_PATTERN.test(lastError)) {
        markProviderRateLimited(provider.id);
        break; // No point retrying — provider is rate limited
      }
    }
  }

  onEvent?.({ type: "provider_done", id: provider.id, ok: false, error: lastError });
  return {
    providerId: provider.id,
    ok: false,
    error: lastError,
  } as ProviderAttempt;
}

async function runProviders(prompt: string, onEvent?: OnEvent): Promise<ProviderAttempt[]> {
  const providers = selectProviders();
  if (providers.length === 0) {
    const statuses = getProviderStatus();
    throw new Error(
      `No providers are configured. Provider status: ${JSON.stringify(statuses)}. Set one of: CF_API_TOKEN+CF_ACCOUNT_ID, GROQ_API_KEY, GEMINI_API_KEY, HUGGINGFACE_API_KEY+HUGGINGFACE_MODEL.`
    );
  }

  return Promise.all(providers.map((provider) => runProviderAttempt(provider, prompt, onEvent)));
}

function scoreLessonPack(pack: LessonPack, objectives: string[]) {
  const corpus = [
    pack.teacher_explanation,
    pack.pupil_explanation,
    pack.worked_example,
    pack.activities.support,
    pack.activities.expected,
    pack.activities.greater_depth,
  ]
    .join(" ")
    .toLowerCase();

  let objectiveCoverage = 0;
  for (const objective of objectives) {
    const objectiveTokens = objective
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 4);

    if (objectiveTokens.some((token) => corpus.includes(token))) {
      objectiveCoverage += 1;
    }
  }

  const differentiationDepth =
    Number(pack.activities.support.length > 20) +
    Number(pack.activities.expected.length > 20) +
    Number(pack.activities.greater_depth.length > 20);

  const misconceptionsDepth = Math.min(pack.common_misconceptions.length, 3);
  const assessmentDepth =
    Math.min(pack.mini_assessment.questions.length, 4) + Math.min(pack.mini_assessment.answers.length, 4);

  return objectiveCoverage * 5 + differentiationDepth * 3 + misconceptionsDepth * 2 + assessmentDepth;
}

function extractYearNumber(yearGroup: string) {
  const match = yearGroup.match(/Year\s+([1-6])/i);
  return match ? Number(match[1]) : null;
}

function normalizeUkSpelling(text: string) {
  return text
    .replace(/\bcolor\b/gi, "colour")
    .replace(/\borganize\b/gi, "organise")
    .replace(/\borganizing\b/gi, "organising")
    .replace(/\bbehavior\b/gi, "behaviour")
    .replace(/\bcenter\b/gi, "centre")
    .replace(/\banalyze\b/gi, "analyse");
}

function objectiveCoverageCount(pack: LessonPack, objectives: string[]) {
  if (objectives.length === 0) return 0;

  const corpus = [
    ...pack.learning_objectives,
    pack.teacher_explanation,
    pack.pupil_explanation,
    pack.worked_example,
    pack.activities.support,
    pack.activities.expected,
    pack.activities.greater_depth,
  ]
    .join(" ")
    .toLowerCase();

  let matched = 0;
  for (const objective of objectives) {
    const objectiveTokens = objective
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 4);

    if (objectiveTokens.some((token) => corpus.includes(token))) {
      matched += 1;
    }
  }

  return matched;
}

function objectiveAlignmentRatio(pack: LessonPack, objectives: string[]) {
  if (objectives.length === 0) return 0;
  return objectiveCoverageCount(pack, objectives) / objectives.length;
}

function ensureUsefulContent(pack: LessonPack, req: LessonPackRequest, objectives: string[]) {
  const defaultObjectives =
    objectives.length > 0
      ? objectives.slice(0, 3)
      : [
          `Understand key ideas in ${req.topic}`,
          `Use subject vocabulary linked to ${req.topic}`,
          `Apply learning about ${req.topic} in context`,
        ];

  const objectiveList = pack.learning_objectives.filter((item) => item.trim().length > 0);
  const completedObjectives = [...objectiveList];
  for (const fallback of defaultObjectives) {
    if (completedObjectives.length >= 3) break;
    if (!completedObjectives.includes(fallback)) {
      completedObjectives.push(fallback);
    }
  }

  const year = extractYearNumber(req.year_group);
  const greaterDepthDefault =
    year && year <= 6
      ? `Reasoning challenge: build and solve a multi-step equation from a word problem about ${req.topic}.`
      : `Challenge task comparing multiple examples related to ${req.topic}.`;

  const misconceptions = [...pack.common_misconceptions.filter((item) => item.trim().length > 0)];
  while (misconceptions.length < 3) {
    misconceptions.push(`Possible misunderstanding ${misconceptions.length + 1} linked to ${req.topic}.`);
  }

  const questions =
    pack.mini_assessment.questions.filter((item) => item.trim().length > 0).length > 0
      ? pack.mini_assessment.questions.filter((item) => item.trim().length > 0)
      : [
          `What is one key fact about ${req.topic}?`,
          `How would you explain ${req.topic} to a partner?`,
          `Give one example linked to ${req.topic}.`,
        ];

  const answers =
    pack.mini_assessment.answers.filter((item) => item.trim().length > 0).length > 0
      ? pack.mini_assessment.answers.filter((item) => item.trim().length > 0)
      : [
          `Mark scheme: a correct fact about ${req.topic}.`,
          `Mark scheme: a clear explanation using subject vocabulary.`,
          `Mark scheme: a relevant and accurate example.`,
        ];

  while (answers.length < questions.length) {
    answers.push(`Mark scheme: acceptable equivalent answer for question ${answers.length + 1}.`);
  }

  return LessonPackSchema.parse({
    ...pack,
    learning_objectives: completedObjectives,
    teacher_explanation: normalizeUkSpelling(pack.teacher_explanation),
    pupil_explanation: normalizeUkSpelling(pack.pupil_explanation),
    worked_example: normalizeUkSpelling(pack.worked_example),
    common_misconceptions: misconceptions,
    activities: {
      support: normalizeUkSpelling(
        pack.activities.support.trim().length > 0
          ? pack.activities.support
          : `Guided task with sentence starters about ${req.topic}.`
      ),
      expected: normalizeUkSpelling(
        pack.activities.expected.trim().length > 0
          ? pack.activities.expected
          : `Core class task applying the main concept in ${req.topic}.`
      ),
      greater_depth:
        pack.activities.greater_depth.trim().length > 0
          ? normalizeUkSpelling(
              /two variables/i.test(pack.activities.greater_depth) && year && year <= 6
                ? greaterDepthDefault
                : pack.activities.greater_depth
            )
          : greaterDepthDefault,
    },
    mini_assessment: {
      questions,
      answers: answers.slice(0, questions.length).map((item) => normalizeUkSpelling(item)),
    },
    plenary: normalizeUkSpelling(pack.plenary),
  });
}

function differentiationDepthScore(pack: LessonPack) {
  return (
    Number(pack.activities.support.length > 40) +
    Number(pack.activities.expected.length > 40) +
    Number(pack.activities.greater_depth.length > 40)
  );
}

function assessmentCompletenessScore(pack: LessonPack) {
  return (
    pack.mini_assessment.questions.filter((q) => q.length > 10).length +
    pack.mini_assessment.answers.filter((a) => a.length > 10).length
  );
}

function ensembleCandidates(
  candidates: Array<{ providerId: string; pack: LessonPack; score: number }>,
  objectives: string[]
): { providerId: string; pack: LessonPack } {
  if (candidates.length === 1) return candidates[0];

  // Base: overall highest scorer provides everything
  const base = candidates[0];

  // Pick the candidate with best objective coverage for learning_objectives
  const bestObjectives = [...candidates].sort(
    (a, b) => objectiveCoverageCount(b.pack, objectives) - objectiveCoverageCount(a.pack, objectives)
  )[0];

  // Pick the candidate with highest differentiation depth for activities
  const bestActivities = [...candidates].sort(
    (a, b) => differentiationDepthScore(b.pack) - differentiationDepthScore(a.pack)
  )[0];

  // Pick the candidate with most complete mini_assessment
  const bestAssessment = [...candidates].sort(
    (a, b) => assessmentCompletenessScore(b.pack) - assessmentCompletenessScore(a.pack)
  )[0];

  const providerIds = candidates.map((c) => c.providerId);
  const ensembleId = providerIds.length > 1 ? `ensemble(${providerIds.join("+")})` : base.providerId;

  return {
    providerId: ensembleId,
    pack: LessonPackSchema.parse({
      ...base.pack,
      learning_objectives: bestObjectives.pack.learning_objectives,
      activities: bestActivities.pack.activities,
      mini_assessment: bestAssessment.pack.mini_assessment,
    }),
  };
}

async function generateBestLessonPack(prompt: string, objectives: string[], onEvent?: OnEvent) {
  const attempts = await runProviders(prompt, onEvent);

  const validCandidates: Array<{ providerId: string; pack: LessonPack; score: number }> = [];
  const errors: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.ok || !attempt.raw) {
      errors.push(`${attempt.providerId}: ${attempt.error ?? "unknown error"}`);
      continue;
    }

    try {
      const parsed = parseJsonObject(attempt.raw);
      const coerced = coerceLessonPackCandidate(parsed);
      const validated = LessonPackSchema.parse(coerced);
      const coverage = objectiveCoverageCount(validated, objectives);
      if (objectives.length > 0 && coverage === 0) {
        errors.push(`${attempt.providerId}: no curriculum objective overlap detected`);
        continue;
      }

      validCandidates.push({
        providerId: attempt.providerId,
        pack: validated,
        score: scoreLessonPack(validated, objectives),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${attempt.providerId}: ${message}`);
    }
  }

  if (validCandidates.length === 0) {
    throw new Error(`No provider succeeded. Attempt details: ${errors.join(" | ")}`);
  }

  validCandidates.sort((a, b) => b.score - a.score);

  const { providerId, pack: lessonPack } = ensembleCandidates(validCandidates, objectives);
  onEvent?.({ type: "ensemble", providerIds: validCandidates.map((c) => c.providerId) });
  return { providerId, lessonPack, attempts };
}

function selectSectionsToRegenerate(improvements: string[]) {
  const sections = new Set<string>();
  const map: Array<{ keyword: string; section: string }> = [
    { keyword: "objective", section: "learning_objectives" },
    { keyword: "teacher", section: "teacher_explanation" },
    { keyword: "pupil", section: "pupil_explanation" },
    { keyword: "misconception", section: "common_misconceptions" },
    { keyword: "activity", section: "activities" },
    { keyword: "adaptation", section: "send_adaptations" },
    { keyword: "plenary", section: "plenary" },
    { keyword: "assessment", section: "mini_assessment" },
    { keyword: "flow", section: "worked_example" },
  ];

  for (const item of improvements) {
    const normalized = item.toLowerCase();
    for (const entry of map) {
      if (normalized.includes(entry.keyword)) {
        sections.add(entry.section);
      }
    }
  }

  if (sections.size === 0) {
    sections.add("learning_objectives");
    sections.add("activities");
  }

  return Array.from(sections);
}

function mergeRegeneratedSections(base: LessonPack, patch: Record<string, unknown>): LessonPack {
  const merged = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    merged[key] = value;
  }

  return LessonPackSchema.parse(merged);
}

async function runQualityPass(
  draft: LessonPack,
  req: LessonPackRequest,
  objectives: string[],
  onEvent?: OnEvent,
): Promise<LessonPack> {
  onEvent?.({ type: "pass", name: "quality" });
  const reviewPrompt = `
You are a senior UK primary curriculum advisor reviewing a lesson pack for classroom quality.
Return ONLY valid JSON: { "approved": boolean, "improvements": string[] }

Mark "approved": false and list specific improvements if ANY of these issues exist:
1. learning_objectives do not start with a Bloom's Taxonomy verb or are vague/generic
2. teacher_explanation is fewer than 3 sentences or lacks subject-specific vocabulary
3. pupil_explanation uses language too abstract or complex for ${req.year_group}
4. worked_example skips steps or does not show full working
5. Any common_misconception is generic and not specific to this topic
6. Any activity (support/expected/greater_depth) is fewer than 2 sentences or lacks differentiation
7. greater_depth activity is just "more of the same" rather than a reasoning/justification challenge
8. send_adaptations are generic rather than naming specific strategies or resources
9. plenary does not describe a specific, named consolidation activity
10. mini_assessment does not include 4 questions at ascending challenge levels
11. Any field contains placeholder text, template text, or is shorter than expected

Year Group: ${req.year_group}
Subject: ${req.subject}
Topic: ${req.topic}
Curriculum Objectives: ${objectives.join("; ")}
Lesson Pack:
${JSON.stringify(draft, null, 2)}
  `;

  try {
    const reviewAttempts = await runProviders(reviewPrompt, onEvent);
    let review: LessonPackReview | null = null;

    for (const attempt of reviewAttempts) {
      if (!attempt.ok || !attempt.raw) continue;
      try {
        review = parseJsonObject(attempt.raw) as LessonPackReview;
        break;
      } catch {
        // Try next successful provider output.
      }
    }

    if (!review || review.approved) {
      return draft;
    }

    const sections = selectSectionsToRegenerate(review.improvements ?? []);
    const regeneratePrompt = `
Regenerate only the flagged sections of this lesson pack.

Flagged sections: ${sections.join(", ")}
Improvements needed: ${JSON.stringify(review.improvements ?? [], null, 2)}

Return ONLY a JSON object with those section keys and corrected values.
Do not include any other keys.

Lesson Pack:
${JSON.stringify(draft, null, 2)}
  `;

    const regenAttempts = await runProviders(regeneratePrompt, onEvent);
    for (const attempt of regenAttempts) {
      if (!attempt.ok || !attempt.raw) continue;
      try {
        const patch = parseJsonObject(attempt.raw) as Record<string, unknown>;
        return mergeRegeneratedSections(draft, patch);
      } catch {
        // Try next successful provider output.
      }
    }
  } catch {
    // Review pass should never block delivery of a valid first draft.
  }

  return draft;
}

async function runAlignmentPass(
  draft: LessonPack,
  req: LessonPackRequest,
  objectives: string[],
  onEvent?: OnEvent,
): Promise<LessonPack> {
  onEvent?.({ type: "pass", name: "alignment" });
  if (objectives.length === 0) return draft;

  const minAlignmentRatio = Number(process.env.ENGINE_MIN_ALIGNMENT_RATIO ?? 0.6);
  if (objectiveAlignmentRatio(draft, objectives) >= minAlignmentRatio) {
    return draft;
  }

  const alignmentPrompt = `
Improve this lesson pack so it explicitly aligns to these UK curriculum objectives.
Prioritise revising:
- learning_objectives
- teacher_explanation
- pupil_explanation
- worked_example
- activities
- mini_assessment

Return ONLY a JSON object with those keys.
Do not include any other keys.

Curriculum Objectives:
${objectives.join("; ")}

Lesson Pack:
${JSON.stringify(draft, null, 2)}
  `;

  const attempts = await runProviders(alignmentPrompt, onEvent);
  for (const attempt of attempts) {
    if (!attempt.ok || !attempt.raw) continue;

    try {
      const patch = parseJsonObject(attempt.raw) as Record<string, unknown>;
      const merged = mergeRegeneratedSections(draft, patch);
      if (objectiveAlignmentRatio(merged, objectives) >= objectiveAlignmentRatio(draft, objectives)) {
        return merged;
      }
    } catch {
      // Try next provider response.
    }
  }

  return draft;
}

function attachProgrammaticSlides(pack: LessonPack): LessonPack {
  return LessonPackSchema.parse({
    ...pack,
    slides: lessonPackToSlides(pack),
  });
}

export function getLessonPackCacheKey(req: LessonPackRequest) {
  return `v3:${JSON.stringify(req)}`;
}

export async function generateLessonPackWithMeta(
  req: LessonPackRequest,
  onEvent?: OnEvent,
): Promise<{
  pack: LessonPack;
  providerId: string;
  cacheHit: boolean;
  meta: LessonPackGenerationMeta;
}> {
  const cacheKey = getLessonPackCacheKey(req);
  const cached = !req.feedback && cache.get<LessonPack>(cacheKey);
  if (cached) {
    const cachedMeta = cached._meta ?? {
      usedCurriculumObjectives: [],
      usedContextNotes: Boolean(req.context_notes?.trim()),
      usedTeacherProfile: Boolean(req.profile),
      passesRun: ["quality", "alignment", "finalize"] as Array<"quality" | "alignment" | "finalize">,
      confidence: "medium" as const,
      confidenceReason: "Cached draft reused from a previous generation.",
    };
    return {
      pack: cached,
      providerId: "cache",
      cacheHit: true,
      meta: cachedMeta,
    };
  }

  const objectives = await retrieveObjectives(req.year_group, req.subject, req.topic);
  // Non-fatal: if no objectives found, the AI generates appropriate ones from year group + subject context.

  const teacherProfile = req.profile ?? null;

  const bloomsVerbs =
    req.year_group === "Reception" || req.year_group === "Year 1" || req.year_group === "Year 2"
      ? "Know, Identify, Name, Count, Match, Sequence, Retell, Recognise, Describe"
      : req.year_group === "Year 3" || req.year_group === "Year 4"
        ? "Describe, Explain, Compare, Apply, Organise, Classify, Summarise, Demonstrate"
        : "Analyse, Justify, Evaluate, Synthesise, Argue, Deduce, Investigate, Critique";

  const prompt = `
You are PrimaryAI, an expert UK primary school curriculum writer with deep knowledge of the National Curriculum.
Return ONLY valid JSON. No markdown, no code fences, no commentary — raw JSON only.
Set "slides" to [] — slides are generated separately.
Use UK English spelling throughout (colour, practise, recognise, organise, behaviour, metre).
Never include real pupil names or personal data.

━━━ LESSON CONTEXT ━━━
Year Group: ${req.year_group}
Subject: ${req.subject}
Topic: ${req.topic}
Curriculum Objectives: ${objectives.join("; ")}
School Type: ${teacherProfile?.schoolType ?? "primary"}
Teacher Tone Preference: ${teacherProfile?.tone ?? "professional_uk"}
SEND Focus: ${teacherProfile?.sendFocus ?? false}
Teaching Approach: ${(teacherProfile?.teachingApproach ?? "cpa") === "cpa" ? "Concrete-Pictorial-Abstract (CPA) — use physical/visual representations before abstract notation, reference manipulatives and diagrams in activities and worked examples" : (teacherProfile?.teachingApproach ?? "cpa") === "direct_instruction" ? "Direct Instruction — teacher-led explanation followed by guided and independent practice; steps are clearly modelled before pupils attempt independently" : (teacherProfile?.teachingApproach ?? "cpa") === "problem_solving" ? "Problem-Solving Led — begin with a rich problem or challenge that motivates the concept; pupils discover or construct understanding through reasoning" : "Inquiry-Based — pupils investigate, question and explore; activities should be open-ended with pupils generating their own examples and generalisations"}
Ability Mix: ${(teacherProfile?.abilityMix ?? "mixed") === "mixed" ? "Mixed ability — differentiated activities must span a wide range; support, expected and greater depth tasks should be clearly distinct" : (teacherProfile?.abilityMix ?? "mixed") === "predominantly_lower" ? "Predominantly lower ability — pitch baseline expectations lower, include more scaffolding and smaller steps; greater depth task is still required but may be more guided" : "Predominantly higher ability — raise the baseline; expected task should be challenging for most pupils, greater depth should stretch the most able significantly"}${teacherProfile?.classNotes ? `
About this class: ${teacherProfile.classNotes}` : ""}${req.context_notes ? `

━━━ UPLOADED CLASS CONTEXT ━━━
Use this uploaded context carefully (targets, SEN notes, attainment data, pupil needs, etc.) when tailoring the lesson:
${req.context_notes}` : ""}
EAL in class: ${teacherProfile?.ealPercent ?? 0}%
Pupil Premium in class: ${teacherProfile?.pupilPremiumPercent ?? 0}%
Generally above expected standard: ${teacherProfile?.aboveStandardPercent ?? 0}%
Generally below expected standard: ${teacherProfile?.belowStandardPercent ?? 0}%
Hugely above expected standard: ${teacherProfile?.hugelyAboveStandardPercent ?? 0}%
Hugely below expected standard: ${teacherProfile?.hugelyBelowStandardPercent ?? 0}%
Planning rule: Calibrate task difficulty, scaffolding, and vocabulary support using these percentages while remaining fully aligned to DfE National Curriculum expectations for ${req.year_group}.${req.feedback ? `

━━━ TEACHER FEEDBACK ━━━
The teacher has reviewed a previous version of this lesson pack and requested these specific changes:
${req.feedback}

Apply these changes carefully. All other sections not mentioned in the feedback should still be high quality and complete.` : ""}

━━━ CONTENT STANDARDS ━━━

learning_objectives — 3 to 4 items:
  • Begin each with a Bloom's Taxonomy verb appropriate to ${req.year_group}: ${bloomsVerbs}
  • Each objective must be specific, measurable, and directly tied to the curriculum objectives above
  • State what pupils will be able to DO or KNOW by the end of the lesson
  • Example for Year 4 Fractions: "Explain the relationship between a numerator and denominator using the part-whole model" or "Apply understanding of equivalent fractions to compare fractions with different denominators"

teacher_explanation — 4 to 6 sentences:
  • Written for a qualified teacher — assumes professional subject knowledge
  • Define and use correct subject-specific vocabulary in context
  • Reference the prior knowledge pupils are expected to bring to this lesson
  • Describe the key conceptual step or common pedagogical approach for this topic
  • Mention any relevant mathematical/scientific/linguistic structure the teacher should make explicit
  • Example: "When introducing column subtraction with exchange, pupils must first be secure in understanding place value to at least 100. The key conceptual shift is recognising that one ten can be exchanged for ten ones when the subtrahend digit exceeds the minuend digit..."

pupil_explanation — 3 to 5 sentences:
  • Written at the reading level of ${req.year_group} pupils
  • Use analogy, everyday context, or a concrete real-world example that makes the concept tangible
  • Avoid abstract or formal language — explain as if speaking directly to the class
  • Example for Year 3 Fractions: "A fraction is like sharing a pizza fairly between friends. If you cut it into 4 equal slices and you eat one, you have eaten one quarter of the pizza — we write that as 1/4. The bottom number tells you how many equal parts there are altogether..."

worked_example — step-by-step walkthrough:
  • Walk through ONE complete, representative example with clearly numbered steps
  • Show all working — do not skip steps or jump to the answer
  • Use the exact mathematical/scientific/grammatical conventions expected at ${req.year_group}
  • End with a clearly stated solution or conclusion
  • Example: "Step 1: Write 347 + 285 vertically, lining up hundreds, tens and ones. Step 2: Add the ones: 7 + 5 = 12. Write 2 in the ones column and carry 1 to the tens. Step 3: Add the tens: 4 + 8 + 1 (carried) = 13..."

common_misconceptions — exactly 3 items:
  • Format each as: "Pupils often think [misconception]. In fact, [correct understanding and how to address it]."
  • Base these on well-documented errors for this exact topic and year group — not generic ones
  • Include a brief suggestion for how to correct each misconception

activities.support — 3 to 4 sentences:
  • A concrete, scaffolded task with specific named resources (word bank, sentence frames, number line, hundred square, writing frame, visual prompt cards, base-ten blocks, etc.)
  • Describe exactly what the pupil does, what scaffold is provided, and what a successful response looks like
  • Appropriate for pupils working below age-related expectations

activities.expected — 3 to 4 sentences:
  • A clear independent task with explicit success criteria
  • Describe what pupils produce or demonstrate and how they record their learning
  • Appropriate for pupils working at age-related expectations

activities.greater_depth — 3 to 4 sentences:
  • A reasoning or open-ended challenge that demands higher-order thinking — NOT simply more of the same work
  • Require pupils to justify, prove, spot patterns, find exceptions, explain why, or apply to an unfamiliar context
  • Include a specific question, scenario, or prompt they respond to
  • Appropriate for pupils working above age-related expectations

send_adaptations — 3 to 4 items:
  • Each adaptation should name the type of need it addresses (e.g. "For pupils with working memory difficulties:", "For pupils with dyslexia:", "For EAL learners:", "For pupils with processing speed difficulties:")
  • Be concrete and actionable — name specific resources, strategies, or adjustments
  • ${teacherProfile?.sendFocus ? "SEND focus is ON — make these particularly detailed and practical." : "Include a range of needs across the adaptations."}

plenary — 2 to 4 sentences:
  • Specify a concrete consolidation activity — not just "ask the class what they learned"
  • Choose from: exit ticket with a specific question, show-me board challenge, think-pair-share prompt, vocabulary card sort, true/false statement voting, mini whiteboard check
  • State exactly what question or task the teacher poses, and what evidence of learning it gathers

mini_assessment.questions — exactly 4 questions in ascending challenge order:
  • Q1: Recall — a direct knowledge or definition question
  • Q2: Understanding — explain or describe in own words
  • Q3: Application — solve a new example or apply the concept
  • Q4: Greater depth — justify a reasoning claim, explain why, or evaluate a statement

mini_assessment.answers — exactly 4 mark-scheme answers, one per question:
  • Written in the style of a teacher mark scheme
  • State the expected answer plus acceptable alternatives where appropriate
  • For Q4, describe the key features of a full-mark response (e.g. "Award 2 marks for...")

━━━ OUTPUT SCHEMA ━━━
${JSON.stringify(LESSON_PACK_OUTPUT_TEMPLATE, null, 2)}
  `;

  if (process.env.NODE_ENV === "development") {
    console.debug("lesson-pack-profile-context", {
      year_group: req.year_group,
      subject: req.subject,
      profile: teacherProfile ?? null,
    });
  }

  const generated = await generateBestLessonPack(prompt, objectives, onEvent);
  const reviewed = await runQualityPass(generated.lessonPack, req, objectives, onEvent);
  const aligned = await runAlignmentPass(reviewed, req, objectives, onEvent);
  onEvent?.({ type: "pass", name: "finalize" });
  const useful = ensureUsefulContent(aligned, req, objectives);
  const confidence: LessonPackGenerationMeta["confidence"] =
    objectives.length >= 2
      ? "high"
      : req.context_notes?.trim().length
        ? "medium"
        : req.topic.trim().split(/\s+/).length >= 2
          ? "medium"
          : "low";
  const confidenceReason =
    confidence === "high"
      ? "Retrieved curriculum objectives gave the draft a strong alignment basis."
      : confidence === "medium"
        ? "The draft has enough lesson context to be useful, but should still be checked carefully."
        : "The topic is broad or lightly specified, so the draft relies on more AI inference than usual.";
  const meta: LessonPackGenerationMeta = {
    usedCurriculumObjectives: objectives,
    usedContextNotes: Boolean(req.context_notes?.trim()),
    usedTeacherProfile: Boolean(req.profile),
    passesRun: ["quality", "alignment", "finalize"],
    confidence,
    confidenceReason,
  };
  const finalized = LessonPackSchema.parse({
    ...attachProgrammaticSlides(useful),
    _meta: meta,
  });

  if (!req.feedback) {
    cache.set(cacheKey, finalized);
  }
  record(generated.providerId, req);
  return {
    pack: finalized,
    providerId: generated.providerId,
    cacheHit: false,
    meta,
  };
}

export async function generateLessonPack(req: LessonPackRequest): Promise<LessonPack> {
  const generated = await generateLessonPackWithMeta(req);
  return generated.pack;
}
