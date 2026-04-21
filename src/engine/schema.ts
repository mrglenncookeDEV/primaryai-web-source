import { z } from "zod";
import { canonicalizeSubject, canonicalizeYearGroup, normalizeTopic } from "./curriculum";

const DiffGroupSchema = z.object({
  group_size_hint: z.string(),
  activity: z.string(),
  questions: z.array(z.string()),
  talk_prompt: z.string(),
  exit_ticket: z.string(),
  extension: z.string().optional(),
});

export const LessonPackSchema = z.object({
  year_group: z.string(),
  subject: z.string(),
  topic: z.string(),
  learning_objectives: z.array(z.string()),
  teacher_explanation: z.string(),
  pupil_explanation: z.string(),
  worked_example: z.string(),
  common_misconceptions: z.array(z.string()),
  activities: z.object({
    support: z.string(),
    expected: z.string(),
    greater_depth: z.string(),
  }),
  differentiation: z.object({
    lower: DiffGroupSchema,
    core: DiffGroupSchema,
    higher: DiffGroupSchema,
  }).optional(),
  send_adaptations: z.array(z.string()),
  lesson_sections: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      teacher_prompts: z.array(z.string()).optional(),
      checks_for_understanding: z.array(z.string()).optional(),
      rationale_badge: z.string().optional(),
    })
  ).optional(),
  lesson_hook: z.string().optional(),
  safety_notes: z.array(z.string()).optional(),
  timing_guide: z.string().optional(),
  thinking_questions: z.array(
    z.object({
      stem: z.string(),
      type: z.string(),
      bloom_level: z.string(),
    })
  ).optional(),
  next_steps: z.array(
    z.object({
      pupil: z.string(),
      next_step: z.string(),
      lesson_response: z.string().optional(),
    })
  ).optional(),
  rationale_tags: z.array(
    z.object({
      decision: z.string(),
      source: z.string(),
      note: z.string(),
    })
  ).optional(),
  plenary: z.string(),
  mini_assessment: z.object({
    questions: z.array(z.string()),
    answers: z.array(z.string()),
  }),
  slides: z.array(
    z.object({
      title: z.string(),
      bullets: z.array(z.string()),
      speaker_notes: z.string().optional(),
    })
  ),
  _meta: z.object({
    autoSaved: z.boolean().optional(),
    usedCurriculumObjectives: z.array(z.string()),
    usedContextNotes: z.boolean(),
    usedTeacherProfile: z.boolean(),
    passesRun: z.array(z.enum(["quality", "alignment", "finalize"])),
    confidence: z.enum(["high", "medium", "low"]),
    confidenceReason: z.string(),
  }).optional(),
});

export const LessonPackRequestSchema = z
  .object({
    year_group: z.string().min(1),
    subject: z.string().min(1),
    topic: z.string().min(1),
    teacher_id: z.string().optional(),
    feedback: z.string().optional(),
    context_notes: z.string().max(12000).optional(),
    profile: z
      .object({
        defaultYearGroup: z.string().optional().nullable(),
        defaultSubject: z.string().optional().nullable(),
        tone: z.string().optional().nullable(),
        schoolType: z.string().optional().nullable(),
        sendFocus: z.boolean().optional().nullable(),
        classNotes: z.string().optional().nullable(),
        teachingApproach: z.string().optional().nullable(),
        abilityMix: z.string().optional().nullable(),
        ealPercent: z.number().int().min(0).max(100).optional().nullable(),
        pupilPremiumPercent: z.number().int().min(0).max(100).optional().nullable(),
        aboveStandardPercent: z.number().int().min(0).max(100).optional().nullable(),
        belowStandardPercent: z.number().int().min(0).max(100).optional().nullable(),
        hugelyAboveStandardPercent: z.number().int().min(0).max(100).optional().nullable(),
        hugelyBelowStandardPercent: z.number().int().min(0).max(100).optional().nullable(),
      })
      .optional(),
  })
  .transform((value, ctx) => {
    const yearGroup = canonicalizeYearGroup(value.year_group);
    const subject = canonicalizeSubject(value.subject);
    const topic = normalizeTopic(value.topic);

    if (!yearGroup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "year_group must be Reception or Year 1-6",
        path: ["year_group"],
      });
      return z.NEVER;
    }

    if (!subject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "subject is not recognized for UK primary curriculum",
        path: ["subject"],
      });
      return z.NEVER;
    }

    if (!topic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "topic is required",
        path: ["topic"],
      });
      return z.NEVER;
    }

    return {
      ...value,
      year_group: yearGroup,
      subject,
      topic,
    };
  });

export type LessonPack = z.infer<typeof LessonPackSchema>;
export type LessonPackRequestInput = z.infer<typeof LessonPackRequestSchema>;
