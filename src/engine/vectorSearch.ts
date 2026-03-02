import { embedText } from "./embeddings";
import { d1Query, isD1Available } from "./d1";
import curriculum from "../../db/uk_curriculum.json";
import { canonicalizeSubject, canonicalizeYearGroup, tokenizeTopic } from "./curriculum";

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
  const canonicalYearGroup = canonicalizeYearGroup(year_group);
  const canonicalSubject = canonicalizeSubject(subject);
  if (!canonicalYearGroup || !canonicalSubject) {
    return [];
  }

  const normalizedTopic = topic.toLowerCase();
  const topicTokens = new Set(tokenizeTopic(topic));

  return (curriculum as CurriculumItem[])
    .filter((c) => {
      if (c.yearGroup !== canonicalYearGroup || c.subject !== canonicalSubject) {
        return false;
      }

      const keywordScore = c.keywords.reduce((score, keyword) => {
        const normalizedKeyword = keyword.toLowerCase();
        if (normalizedTopic.includes(normalizedKeyword)) {
          return score + 2;
        }

        const keywordTokens = normalizedKeyword.split(/\W+/).filter((token) => token.length > 2);
        if (keywordTokens.some((token) => topicTokens.has(token))) {
          return score + 1;
        }

        return score;
      }, 0);

      return keywordScore > 0;
    })
    .map((c) => c.text);
}

export async function searchObjectives(
  year_group: string,
  subject: string,
  topic: string,
  limit = 5
): Promise<string[]> {
  const canonicalYearGroup = canonicalizeYearGroup(year_group);
  const canonicalSubject = canonicalizeSubject(subject);
  if (!canonicalYearGroup || !canonicalSubject) {
    return [];
  }

  if (!isD1Available()) {
    return fallbackRetrieveObjectives(canonicalYearGroup, canonicalSubject, topic).slice(0, limit);
  }

  const queryEmbedding = await embedText(`${canonicalYearGroup} ${canonicalSubject} ${topic}`);

  const rows = await d1Query<VectorRow>(
    `
      select id, content, embedding
      from curriculum_vectors
      where year_group = ? and subject = ?
    `,
    [canonicalYearGroup, canonicalSubject]
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
  return fallbackRetrieveObjectives(canonicalYearGroup, canonicalSubject, topic).slice(0, limit);
}
