import { z } from "zod";

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

export type LessonPack = z.infer<typeof LessonPackSchema>;
