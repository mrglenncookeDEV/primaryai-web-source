import type { LessonPack } from "../schema";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function lessonPackToPdfHtml(pack: LessonPack) {
  return `
    <html>
      <body>
        <h1>${escapeHtml(pack.subject)} - ${escapeHtml(pack.topic)}</h1>
        <h2>${escapeHtml(pack.year_group)}</h2>
        <h3>Learning Objectives</h3>
        <ul>${pack.learning_objectives.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>
        <h3>Teacher Explanation</h3>
        <p>${escapeHtml(pack.teacher_explanation)}</p>
        <h3>Pupil Explanation</h3>
        <p>${escapeHtml(pack.pupil_explanation)}</p>
      </body>
    </html>
  `.trim();
}
