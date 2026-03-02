import { z } from "zod";
import { canonicalizeSubject, canonicalizeYearGroup, normalizeTopic } from "./curriculum";

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
  send_adaptations: z.array(z.string()),
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
});

export const LessonPackRequestSchema = z
  .object({
    year_group: z.string().min(1),
    subject: z.string().min(1),
    topic: z.string().min(1),
    teacher_id: z.string().optional(),
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
