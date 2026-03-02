export const UK_PRIMARY_YEAR_GROUPS = [
  "Reception",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
] as const;

const SUBJECT_ALIASES: Record<string, string> = {
  maths: "Maths",
  mathematics: "Maths",
  math: "Maths",
  english: "English",
  science: "Science",
  geography: "Geography",
  history: "History",
  computing: "Computing",
  "design and technology": "Design and Technology",
  "design technology": "Design and Technology",
  "d&t": "Design and Technology",
  "art and design": "Art and Design",
  art: "Art and Design",
  music: "Music",
  pe: "PE",
  "physical education": "PE",
  re: "RE",
  "religious education": "RE",
  pshe: "PSHE",
};

export function canonicalizeYearGroup(input: string) {
  const value = input.trim();
  if (!value) return null;

  if (/^reception$/i.test(value)) return "Reception";

  const yearMatch = value.match(/^year\s*([1-6])$/i);
  if (yearMatch) return `Year ${yearMatch[1]}`;

  const numberMatch = value.match(/^([1-6])$/);
  if (numberMatch) return `Year ${numberMatch[1]}`;

  return null;
}

export function canonicalizeSubject(input: string) {
  const key = input.trim().toLowerCase();
  if (!key) return null;
  return SUBJECT_ALIASES[key] ?? null;
}

export function normalizeTopic(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export function tokenizeTopic(input: string) {
  return normalizeTopic(input)
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 2);
}
