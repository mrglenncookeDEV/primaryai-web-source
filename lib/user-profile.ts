import { getSupabaseAdminClient } from "@/lib/supabase";
import type { TeacherProfile } from "@/src/engine/types";

const DEFAULT_PROFILE: Required<Pick<TeacherProfile,
  "defaultYearGroup" | "defaultSubject" | "tone" | "schoolType" | "sendFocus" | "autoSave" | "formatPrefs"
>> & Pick<TeacherProfile, "classNotes" | "teachingApproach" | "abilityMix" | "ealPercent" | "pupilPremiumPercent" | "aboveStandardPercent" | "belowStandardPercent" | "hugelyAboveStandardPercent" | "hugelyBelowStandardPercent"> = {
  defaultYearGroup: "Year 4",
  defaultSubject: "Maths",
  tone: "professional_uk",
  schoolType: "primary",
  sendFocus: false,
  autoSave: false,
  formatPrefs: JSON.stringify({ slidesStyle: "standard", worksheetStyle: "standard" }),
  classNotes: null,
  teachingApproach: "cpa",
  abilityMix: "mixed",
  ealPercent: null,
  pupilPremiumPercent: null,
  aboveStandardPercent: null,
  belowStandardPercent: null,
  hugelyAboveStandardPercent: null,
  hugelyBelowStandardPercent: null,
};

type ProfileRow = {
  user_id: string;
  default_year_group: string;
  default_subject: string;
  tone: string;
  school_type: string;
  send_focus: boolean;
  auto_save: boolean;
  format_prefs: string;
  class_notes: string | null;
  teaching_approach: string | null;
  ability_mix: string | null;
  eal_percent: number | null;
  pupil_premium_percent: number | null;
  above_standard_percent: number | null;
  below_standard_percent: number | null;
  hugely_above_standard_percent: number | null;
  hugely_below_standard_percent: number | null;
};

function toTeacherProfile(userId: string, row?: Partial<ProfileRow> | null): TeacherProfile {
  return {
    id: userId,
    userId,
    defaultYearGroup: row?.default_year_group ?? DEFAULT_PROFILE.defaultYearGroup,
    defaultSubject: row?.default_subject ?? DEFAULT_PROFILE.defaultSubject,
    tone: row?.tone ?? DEFAULT_PROFILE.tone,
    schoolType: row?.school_type ?? DEFAULT_PROFILE.schoolType,
    sendFocus: typeof row?.send_focus === "boolean" ? row.send_focus : DEFAULT_PROFILE.sendFocus,
    autoSave: typeof row?.auto_save === "boolean" ? row.auto_save : DEFAULT_PROFILE.autoSave,
    formatPrefs: row?.format_prefs ?? DEFAULT_PROFILE.formatPrefs,
    classNotes: row?.class_notes ?? DEFAULT_PROFILE.classNotes,
    teachingApproach: row?.teaching_approach ?? DEFAULT_PROFILE.teachingApproach,
    abilityMix: row?.ability_mix ?? DEFAULT_PROFILE.abilityMix,
    ealPercent: row?.eal_percent ?? DEFAULT_PROFILE.ealPercent,
    pupilPremiumPercent: row?.pupil_premium_percent ?? DEFAULT_PROFILE.pupilPremiumPercent,
    aboveStandardPercent: row?.above_standard_percent ?? DEFAULT_PROFILE.aboveStandardPercent,
    belowStandardPercent: row?.below_standard_percent ?? DEFAULT_PROFILE.belowStandardPercent,
    hugelyAboveStandardPercent: row?.hugely_above_standard_percent ?? DEFAULT_PROFILE.hugelyAboveStandardPercent,
    hugelyBelowStandardPercent: row?.hugely_below_standard_percent ?? DEFAULT_PROFILE.hugelyBelowStandardPercent,
  };
}

export async function getOrCreateUserProfile(userId: string): Promise<TeacherProfile> {
  const db = getSupabaseAdminClient();
  if (!db) return toTeacherProfile(userId);

  const { data, error } = await db
    .from("user_profile_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data) {
    return toTeacherProfile(userId, data);
  }

  await db.from("user_profile_settings").upsert(
    {
      user_id: userId,
      default_year_group: DEFAULT_PROFILE.defaultYearGroup,
      default_subject: DEFAULT_PROFILE.defaultSubject,
      tone: DEFAULT_PROFILE.tone,
      school_type: DEFAULT_PROFILE.schoolType,
      send_focus: DEFAULT_PROFILE.sendFocus,
      auto_save: DEFAULT_PROFILE.autoSave,
      format_prefs: DEFAULT_PROFILE.formatPrefs,
      class_notes: DEFAULT_PROFILE.classNotes,
      teaching_approach: DEFAULT_PROFILE.teachingApproach,
      ability_mix: DEFAULT_PROFILE.abilityMix,
      eal_percent: DEFAULT_PROFILE.ealPercent,
      pupil_premium_percent: DEFAULT_PROFILE.pupilPremiumPercent,
      above_standard_percent: DEFAULT_PROFILE.aboveStandardPercent,
      below_standard_percent: DEFAULT_PROFILE.belowStandardPercent,
      hugely_above_standard_percent: DEFAULT_PROFILE.hugelyAboveStandardPercent,
      hugely_below_standard_percent: DEFAULT_PROFILE.hugelyBelowStandardPercent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return toTeacherProfile(userId);
}

export async function updateUserProfile(userId: string, patch: Partial<TeacherProfile>): Promise<TeacherProfile> {
  const current = await getOrCreateUserProfile(userId);
  const next = {
    ...current,
    defaultYearGroup: patch.defaultYearGroup ?? current.defaultYearGroup ?? DEFAULT_PROFILE.defaultYearGroup,
    defaultSubject: patch.defaultSubject ?? current.defaultSubject ?? DEFAULT_PROFILE.defaultSubject,
    tone: patch.tone ?? current.tone ?? DEFAULT_PROFILE.tone,
    schoolType: patch.schoolType ?? current.schoolType ?? DEFAULT_PROFILE.schoolType,
    sendFocus: typeof patch.sendFocus === "boolean" ? patch.sendFocus : Boolean(current.sendFocus),
    autoSave: typeof patch.autoSave === "boolean" ? patch.autoSave : Boolean(current.autoSave),
    formatPrefs: patch.formatPrefs ?? current.formatPrefs ?? DEFAULT_PROFILE.formatPrefs,
    classNotes: patch.classNotes !== undefined ? patch.classNotes : (current.classNotes ?? null),
    teachingApproach: patch.teachingApproach !== undefined ? patch.teachingApproach : (current.teachingApproach ?? null),
    abilityMix: patch.abilityMix !== undefined ? patch.abilityMix : (current.abilityMix ?? null),
    ealPercent: patch.ealPercent !== undefined ? patch.ealPercent : (current.ealPercent ?? null),
    pupilPremiumPercent: patch.pupilPremiumPercent !== undefined ? patch.pupilPremiumPercent : (current.pupilPremiumPercent ?? null),
    aboveStandardPercent: patch.aboveStandardPercent !== undefined ? patch.aboveStandardPercent : (current.aboveStandardPercent ?? null),
    belowStandardPercent: patch.belowStandardPercent !== undefined ? patch.belowStandardPercent : (current.belowStandardPercent ?? null),
    hugelyAboveStandardPercent: patch.hugelyAboveStandardPercent !== undefined ? patch.hugelyAboveStandardPercent : (current.hugelyAboveStandardPercent ?? null),
    hugelyBelowStandardPercent: patch.hugelyBelowStandardPercent !== undefined ? patch.hugelyBelowStandardPercent : (current.hugelyBelowStandardPercent ?? null),
  } as TeacherProfile;

  const db = getSupabaseAdminClient();
  if (db) {
    await db.from("user_profile_settings").upsert(
      {
        user_id: userId,
        default_year_group: next.defaultYearGroup,
        default_subject: next.defaultSubject,
        tone: next.tone,
        school_type: next.schoolType,
        send_focus: Boolean(next.sendFocus),
        auto_save: Boolean(next.autoSave),
        format_prefs: next.formatPrefs,
        class_notes: next.classNotes ?? null,
        teaching_approach: next.teachingApproach ?? null,
        ability_mix: next.abilityMix ?? null,
        eal_percent: next.ealPercent ?? null,
        pupil_premium_percent: next.pupilPremiumPercent ?? null,
        above_standard_percent: next.aboveStandardPercent ?? null,
        below_standard_percent: next.belowStandardPercent ?? null,
        hugely_above_standard_percent: next.hugelyAboveStandardPercent ?? null,
        hugely_below_standard_percent: next.hugelyBelowStandardPercent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return next;
}

export function toEngineProfile(profile: TeacherProfile) {
  return {
    defaultYearGroup: profile.defaultYearGroup ?? null,
    defaultSubject: profile.defaultSubject ?? null,
    tone: profile.tone ?? null,
    schoolType: profile.schoolType ?? null,
    sendFocus: profile.sendFocus ?? false,
    classNotes: profile.classNotes ?? null,
    teachingApproach: profile.teachingApproach ?? null,
    abilityMix: profile.abilityMix ?? null,
    ealPercent: profile.ealPercent ?? null,
    pupilPremiumPercent: profile.pupilPremiumPercent ?? null,
    aboveStandardPercent: profile.aboveStandardPercent ?? null,
    belowStandardPercent: profile.belowStandardPercent ?? null,
    hugelyAboveStandardPercent: profile.hugelyAboveStandardPercent ?? null,
    hugelyBelowStandardPercent: profile.hugelyBelowStandardPercent ?? null,
  };
}
