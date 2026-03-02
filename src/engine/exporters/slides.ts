import type { LessonPack } from "../schema";

export type Slide = {
  title: string;
  bullets: string[];
  speaker_notes?: string;
};

export function lessonPackToSlides(pack: LessonPack): Slide[] {
  return [
    {
      title: `${pack.subject}: ${pack.topic}`,
      bullets: pack.learning_objectives,
      speaker_notes: `Year group: ${pack.year_group}`,
    },
    {
      title: "Teacher Explanation",
      bullets: [pack.teacher_explanation],
    },
    {
      title: "Worked Example",
      bullets: [pack.worked_example],
    },
    {
      title: "Activities",
      bullets: [
        `Support: ${pack.activities.support}`,
        `Expected: ${pack.activities.expected}`,
        `Greater Depth: ${pack.activities.greater_depth}`,
      ],
    },
    {
      title: "Mini Assessment",
      bullets: pack.mini_assessment.questions,
      speaker_notes: `Answers: ${pack.mini_assessment.answers.join(" | ")}`,
    },
  ];
}
