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
}

export type LessonPackReview = {
  approved: boolean;
  improvements: string[];
};

export type TeacherProfile = {
  id: string;
  preferred_year_group?: string | null;
  tone?: string | null;
  school_type?: string | null;
};
