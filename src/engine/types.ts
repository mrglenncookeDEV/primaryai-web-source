export interface EngineProvider {
  id: string;
  isAvailable(): boolean;
  generate(prompt: string): Promise<unknown>;
}

export interface LessonPackRequest {
  year_group: string;
  subject: string;
  topic: string;
  teacher_id?: string;
  feedback?: string;
  context_notes?: string;
  profile?: {
    defaultYearGroup?: string | null;
    defaultSubject?: string | null;
    tone?: string | null;
    schoolType?: string | null;
    sendFocus?: boolean | null;
    classNotes?: string | null;
    teachingApproach?: string | null;
    abilityMix?: string | null;
    ealPercent?: number | null;
    pupilPremiumPercent?: number | null;
    aboveStandardPercent?: number | null;
    belowStandardPercent?: number | null;
    hugelyAboveStandardPercent?: number | null;
    hugelyBelowStandardPercent?: number | null;
    termName?: string | null;
    termStartDate?: string | null;
    termEndDate?: string | null;
  };
}

export type LessonPackReview = {
  approved: boolean;
  improvements: string[];
};

export type TeacherProfile = {
  id: string;
  userId?: string;
  defaultYearGroup?: string | null;
  defaultSubject?: string | null;
  tone?: string | null;
  schoolType?: string | null;
  sendFocus?: boolean;
  autoSave?: boolean;
  formatPrefs?: string | null;
  classNotes?: string | null;
  teachingApproach?: string | null;
  abilityMix?: string | null;
  ealPercent?: number | null;
  pupilPremiumPercent?: number | null;
  aboveStandardPercent?: number | null;
  belowStandardPercent?: number | null;
  hugelyAboveStandardPercent?: number | null;
  hugelyBelowStandardPercent?: number | null;
  termName?: string | null;
  termStartDate?: string | null;
  termEndDate?: string | null;
};
