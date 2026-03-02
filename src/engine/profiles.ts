import { queryOne } from "@/lib/db";
import type { TeacherProfile } from "./types";

export async function getTeacherProfile(teacherId?: string): Promise<TeacherProfile | null> {
  if (!teacherId) return null;

  const row = await queryOne(
    `
      select id, preferred_year_group, tone, school_type
      from teacher_profiles
      where id = $1
    `,
    [teacherId]
  );

  if (!row) return null;
  return row as TeacherProfile;
}
