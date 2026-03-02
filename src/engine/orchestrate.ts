import { LessonPackSchema, type LessonPack } from "./schema";
import { getProviderStatus, selectProviders } from "./router";
import { retrieveObjectives } from "./retrieve";
import { cache } from "./cache";
import { record } from "./telemetry";
import { lessonPackToSlides } from "./exporters";
import { getTeacherProfile } from "./profiles";
import type { LessonPackRequest, LessonPackReview } from "./types";

type ProviderAttempt = {
  providerId: string;
  ok: boolean;
  raw?: string;
  error?: string;
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

async function runProviderAttempt(provider: { id: string; generate: (prompt: string) => Promise<unknown> }, prompt: string) {
  const timeoutMs = Number(process.env.ENGINE_PROVIDER_TIMEOUT_MS ?? 25000);
  const maxAttempts = Number(process.env.ENGINE_PROVIDER_MAX_ATTEMPTS ?? 2);

  let lastError = "Unknown provider failure";

  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const output = await withTimeout(provider.generate(prompt), timeoutMs);
      return {
        providerId: provider.id,
        ok: true,
        raw: normalizeProviderOutput(output),
      } as ProviderAttempt;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    providerId: provider.id,
    ok: false,
    error: lastError,
  } as ProviderAttempt;
}

async function runProviders(prompt: string): Promise<ProviderAttempt[]> {
  const providers = selectProviders();
  if (providers.length === 0) {
    const statuses = getProviderStatus();
    throw new Error(
      `No providers are configured. Provider status: ${JSON.stringify(statuses)}. Set one of: CF_API_TOKEN+CF_ACCOUNT_ID, GROQ_API_KEY, GEMINI_API_KEY, HUGGINGFACE_API_KEY+HUGGINGFACE_MODEL.`
    );
  }

  return Promise.all(providers.map((provider) => runProviderAttempt(provider, prompt)));
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

async function generateBestLessonPack(prompt: string, objectives: string[]) {
  const attempts = await runProviders(prompt);

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
  return {
    providerId: validCandidates[0].providerId,
    lessonPack: validCandidates[0].pack,
    attempts,
  };
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
  objectives: string[]
): Promise<LessonPack> {
  const reviewPrompt = `
You are reviewing a lesson pack for quality.
Check:
- Clear differentiation
- Curriculum alignment
- Logical flow
Return JSON:
{ "approved": true/false, "improvements": [] }

Year Group: ${req.year_group}
Subject: ${req.subject}
Topic: ${req.topic}
Curriculum Objectives: ${objectives.join("; ")}
Lesson Pack:
${JSON.stringify(draft, null, 2)}
  `;

  try {
    const reviewAttempts = await runProviders(reviewPrompt);
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

    const regenAttempts = await runProviders(regeneratePrompt);
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

function attachProgrammaticSlides(pack: LessonPack): LessonPack {
  return LessonPackSchema.parse({
    ...pack,
    slides: lessonPackToSlides(pack),
  });
}

export async function generateLessonPack(req: LessonPackRequest): Promise<LessonPack> {
  const cacheKey = JSON.stringify(req);
  const cached = cache.get<LessonPack>(cacheKey);
  if (cached) return cached;

  const objectives = await retrieveObjectives(req.year_group, req.subject, req.topic);
  const teacherProfile = await getTeacherProfile(req.teacher_id);

  const prompt = `
You are PrimaryAI Engine. Return ONLY valid JSON matching this schema.
Do not generate slide content; set slides to [] and it will be generated programmatically.
Use ONLY primitive strings/arrays/objects exactly matching keys below.
Do not return nested rich objects for text fields.

Year Group: ${req.year_group}
Subject: ${req.subject}
Topic: ${req.topic}
Curriculum Objectives: ${objectives.join("; ")}
Teacher Profile Context: ${JSON.stringify(teacherProfile ?? {}, null, 2)}

Generate structured lesson pack with:
${JSON.stringify(LessonPackSchema.shape, null, 2)}
  `;

  const generated = await generateBestLessonPack(prompt, objectives);
  const reviewed = await runQualityPass(generated.lessonPack, req, objectives);
  const finalized = attachProgrammaticSlides(reviewed);

  cache.set(cacheKey, finalized);
  record(generated.providerId, req);
  return finalized;
}
