import { readFile } from "node:fs/promises";
import { embedText } from "../src/engine/embeddings";
import { d1Exec, isD1Available } from "../src/engine/d1";

type CurriculumItem = {
  yearGroup: string;
  subject: string;
  keywords?: string[];
  text: string;
};

async function ingest() {
  if (!isD1Available()) {
    throw new Error("D1 is not configured. Set CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID");
  }

  const raw = await readFile(new URL("../db/uk_curriculum.json", import.meta.url), "utf8");
  const curriculum = JSON.parse(raw) as CurriculumItem[];

  for (const [index, item] of curriculum.entries()) {
    const id = `${item.yearGroup}:${item.subject}:${index}`;
    const seedText = `${item.yearGroup} ${item.subject} ${item.text} ${(item.keywords ?? []).join(" ")}`;
    const embedding = await embedText(seedText);

    await d1Exec(
      `
        insert into curriculum_vectors (id, year_group, subject, content, embedding)
        values (?, ?, ?, ?, ?)
        on conflict(id) do update set
          year_group = excluded.year_group,
          subject = excluded.subject,
          content = excluded.content,
          embedding = excluded.embedding
      `,
      [id, item.yearGroup, item.subject, item.text, JSON.stringify(embedding)]
    );

    console.log(`Ingested: ${id}`);
  }
}

ingest().catch((err) => {
  console.error(err);
  process.exit(1);
});
