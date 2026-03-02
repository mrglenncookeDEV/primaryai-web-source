import { embedText } from "./embeddings";
import { d1Query, isD1Available } from "./d1";
import curriculum from "../../db/uk_curriculum.json";

type VectorRow = {
  id: string;
  content: string;
  embedding: unknown;
};

type CurriculumItem = {
  yearGroup: string;
  subject: string;
  keywords: string[];
  text: string;
};

function parseEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => Number(v));
    } catch {
      return [];
    }
  }

  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data.map((v) => Number(v));
    }
  }

  return [];
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function fallbackRetrieveObjectives(year_group: string, subject: string, topic: string) {
  const normalizedTopic = topic.toLowerCase();

  return (curriculum as CurriculumItem[])
    .filter((c) => {
      const keywordMatch = c.keywords.some((keyword) =>
        normalizedTopic.includes(keyword.toLowerCase())
      );

      return c.yearGroup === year_group && c.subject === subject && keywordMatch;
    })
    .map((c) => c.text);
}

export async function searchObjectives(
  year_group: string,
  subject: string,
  topic: string,
  limit = 5
): Promise<string[]> {
  if (!isD1Available()) {
    return fallbackRetrieveObjectives(year_group, subject, topic).slice(0, limit);
  }

  const queryEmbedding = await embedText(`${year_group} ${subject} ${topic}`);

  const rows = await d1Query<VectorRow>(
    `
      select id, content, embedding
      from curriculum_vectors
      where year_group = ? and subject = ?
    `,
    [year_group, subject]
  );

  const scored = rows
    .map((row) => ({
      content: row.content,
      score: cosineSimilarity(queryEmbedding, parseEmbedding(row.embedding)),
    }))
    .filter((item) => Number.isFinite(item.score) && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.content);

  if (scored.length > 0) return scored;
  return fallbackRetrieveObjectives(year_group, subject, topic).slice(0, limit);
}
