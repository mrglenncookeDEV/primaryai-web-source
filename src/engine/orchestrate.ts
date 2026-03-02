import { LessonPackSchema, type LessonPack } from "./schema";
import { selectProviders } from "./router";
import { retrieveObjectives } from "./retrieve";
import { cache } from "./cache";
import { record } from "./telemetry";
import { lessonPackToSlides } from "./exporters";
import { getTeacherProfile } from "./profiles";
import type { LessonPackRequest, LessonPackReview } from "./types";

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not find JSON object in provider output");
    return JSON.parse(match[0]);
  }
}

async function generateJsonWithProviders(prompt: string) {
  for (const provider of selectProviders()) {
    try {
      const raw = await provider.generate(prompt);
      if (typeof raw !== "string") {
        throw new Error("Provider returned non-string output");
      }

      return {
        providerId: provider.id,
        json: parseJsonObject(raw),
      };
    } catch (err) {
      console.warn(`Provider ${provider.id} failed`, err);
    }
  }

  throw new Error("No provider succeeded");
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

  const reviewRaw = await generateJsonWithProviders(reviewPrompt);
  const review = reviewRaw.json as LessonPackReview;

  if (review?.approved) {
    return draft;
  }

  const sections = selectSectionsToRegenerate(review?.improvements ?? []);
  const regeneratePrompt = `
Regenerate only the flagged sections of this lesson pack.

Flagged sections: ${sections.join(", ")}
Improvements needed: ${JSON.stringify(review?.improvements ?? [], null, 2)}

Return ONLY a JSON object with those section keys and corrected values.
Do not include any other keys.

Lesson Pack:
${JSON.stringify(draft, null, 2)}
  `;

  const regenerated = await generateJsonWithProviders(regeneratePrompt);
  const patch = regenerated.json as Record<string, unknown>;
  return mergeRegeneratedSections(draft, patch);
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

Year Group: ${req.year_group}
Subject: ${req.subject}
Topic: ${req.topic}
Curriculum Objectives: ${objectives.join("; ")}
Teacher Profile Context: ${JSON.stringify(teacherProfile ?? {}, null, 2)}

Generate structured lesson pack with:
${JSON.stringify(LessonPackSchema.shape, null, 2)}
  `;

  const generated = await generateJsonWithProviders(prompt);
  const initialValidated = LessonPackSchema.parse(generated.json);
  const reviewed = await runQualityPass(initialValidated, req, objectives);
  const finalized = attachProgrammaticSlides(reviewed);

  cache.set(cacheKey, finalized);
  record(generated.providerId, req);
  return finalized;
}
