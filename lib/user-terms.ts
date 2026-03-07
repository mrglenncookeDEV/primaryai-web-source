import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOrCreateUserProfile, updateUserProfile } from "@/lib/user-profile";

export type UserTerm = {
  id: string;
  termName: string;
  termStartDate: string;
  termEndDate: string;
};

export type ActiveTermSummary = {
  termName: string;
  termStartDate: string;
  termEndDate: string;
  daysRemaining: number;
};

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normaliseTermName(value: unknown) {
  return String(value || "").trim();
}

function normaliseTermDate(value: unknown) {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function chooseSummaryTerm(terms: UserTerm[]) {
  if (terms.length === 0) return null;
  const today = toISODate(new Date());
  const active = terms.find((term) => today >= term.termStartDate && today <= term.termEndDate);
  if (active) return active;
  const future = terms.find((term) => term.termStartDate >= today);
  if (future) return future;
  return terms[terms.length - 1] ?? null;
}

async function getBankHolidayIsoSet() {
  try {
    const response = await fetch("https://www.gov.uk/bank-holidays.json", {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) return new Set<string>();
    const data = await response.json().catch(() => null) as
      | { ["england-and-wales"]?: { events?: Array<{ date?: string }> }; ["united-kingdom"]?: { events?: Array<{ date?: string }> } }
      | null;
    const events = data?.["england-and-wales"]?.events ?? data?.["united-kingdom"]?.events ?? [];
    return new Set(
      events
        .map((event) => normaliseTermDate(event?.date))
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function countWorkingDaysRemaining(termEndDate: string, bankHolidays: Set<string>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISODate(today);
  if (todayIso > termEndDate) return 0;

  let count = 0;
  for (let cursor = new Date(today); toISODate(cursor) <= termEndDate; cursor = addDays(cursor, 1)) {
    const iso = toISODate(cursor);
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    if (!isWeekend && !bankHolidays.has(iso)) {
      count += 1;
    }
  }

  return count;
}

export async function getActiveTermSummary(userId: string): Promise<ActiveTermSummary | null> {
  const terms = await getUserTerms(userId);
  if (terms.length === 0) return null;

  const todayIso = toISODate(new Date());
  const activeTerm = terms.find((term) => todayIso >= term.termStartDate && todayIso <= term.termEndDate);
  if (!activeTerm) return null;

  const bankHolidays = await getBankHolidayIsoSet();
  return {
    termName: activeTerm.termName,
    termStartDate: activeTerm.termStartDate,
    termEndDate: activeTerm.termEndDate,
    daysRemaining: countWorkingDaysRemaining(activeTerm.termEndDate, bankHolidays),
  };
}

export async function getUserTerms(userId: string): Promise<UserTerm[]> {
  const db = getSupabaseAdminClient();
  if (!db) return [];

  const { data, error } = await db
    .from("user_profile_terms")
    .select("id,term_name,term_start_date,term_end_date")
    .eq("user_id", userId)
    .order("term_start_date", { ascending: true });

  if (!error && Array.isArray(data) && data.length > 0) {
    return data.map((row) => ({
      id: String(row.id),
      termName: normaliseTermName(row.term_name),
      termStartDate: normaliseTermDate(row.term_start_date),
      termEndDate: normaliseTermDate(row.term_end_date),
    }));
  }

  const profile = await getOrCreateUserProfile(userId);
  if (profile.termStartDate && profile.termEndDate) {
    return [{
      id: "legacy-current-term",
      termName: String(profile.termName || ""),
      termStartDate: profile.termStartDate,
      termEndDate: profile.termEndDate,
    }];
  }

  return [];
}

export async function replaceUserTerms(userId: string, terms: Array<Partial<UserTerm>>) {
  const db = getSupabaseAdminClient();
  if (!db) {
    throw new Error("Profile store unavailable");
  }

  const cleaned = terms
    .map((term) => ({
      id: String(term.id || ""),
      termName: normaliseTermName(term.termName),
      termStartDate: normaliseTermDate(term.termStartDate),
      termEndDate: normaliseTermDate(term.termEndDate),
    }))
    .filter((term) => term.termName || term.termStartDate || term.termEndDate);

  for (const term of cleaned) {
    if (!term.termName || !term.termStartDate || !term.termEndDate) {
      throw new Error("Each term needs a name, start date and end date.");
    }
    if (term.termEndDate < term.termStartDate) {
      throw new Error(`End date must be on or after start date for ${term.termName}.`);
    }
  }

  const { error: deleteError } = await db
    .from("user_profile_terms")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error("Could not update term dates.");
  }

  if (cleaned.length > 0) {
    const { error: insertError } = await db
      .from("user_profile_terms")
      .insert(cleaned.map((term) => ({
        user_id: userId,
        term_name: term.termName,
        term_start_date: term.termStartDate,
        term_end_date: term.termEndDate,
        updated_at: new Date().toISOString(),
      })));

    if (insertError) {
      throw new Error("Could not save term dates.");
    }
  }

  const summary = chooseSummaryTerm(
    [...cleaned].sort((a, b) => a.termStartDate.localeCompare(b.termStartDate)),
  );

  await updateUserProfile(userId, {
    termName: summary?.termName ?? null,
    termStartDate: summary?.termStartDate ?? null,
    termEndDate: summary?.termEndDate ?? null,
  });

  return getUserTerms(userId);
}
