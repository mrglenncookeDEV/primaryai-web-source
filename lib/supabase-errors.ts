type DbErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function errorText(error: DbErrorLike | null | undefined) {
  return [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isMissingRelationError(error: DbErrorLike | null | undefined, relation: string) {
  const code = String(error?.code || "").toUpperCase();
  const text = errorText(error);
  const quotedRelation = `"${relation.toLowerCase()}"`;

  if (code === "42P01" || code === "PGRST205") return true;

  return (
    text.includes(`relation ${quotedRelation} does not exist`) ||
    text.includes(`relation public.${relation.toLowerCase()} does not exist`) ||
    text.includes(`could not find the table 'public.${relation.toLowerCase()}'`) ||
    text.includes(`could not find the table "${relation.toLowerCase()}"`) ||
    text.includes(`could not find the table '${relation.toLowerCase()}'`)
  );
}

export function isMissingColumnError(error: DbErrorLike | null | undefined, ...columns: string[]) {
  const code = String(error?.code || "").toUpperCase();
  const text = errorText(error);

  if (code === "42703" || code === "PGRST204") return true;

  return columns.some((column) => {
    const name = column.toLowerCase();
    return (
      text.includes(`column "${name}" does not exist`) ||
      text.includes(`column ${name} does not exist`) ||
      text.includes(`could not find the '${name}' column`) ||
      text.includes(`could not find the "${name}" column`)
    );
  });
}

export function formatSupabaseError(error: DbErrorLike | null | undefined, fallback: string) {
  const message = String(error?.message || "").trim();
  const details = String(error?.details || "").trim();
  const hint = String(error?.hint || "").trim();
  const parts = [message, details, hint].filter(Boolean);
  return parts.length ? `${fallback}: ${parts.join(" ")}` : fallback;
}
