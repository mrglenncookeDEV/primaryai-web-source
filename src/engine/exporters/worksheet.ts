import type { LessonPack } from "../schema";

export type WorksheetDoc = {
  title: string;
  instructions: string;
  tasks: string[];
  plenary: string;
};

export function lessonPackToWorksheet(pack: LessonPack): WorksheetDoc {
  return {
    title: `${pack.subject} Worksheet: ${pack.topic}`,
    instructions: pack.pupil_explanation,
    tasks: [pack.activities.support, pack.activities.expected, pack.activities.greater_depth],
    plenary: pack.plenary,
  };
}
