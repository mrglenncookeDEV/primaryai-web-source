import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isLeaderSession } from "@/lib/survey-auth";

function isLegacySurveySchemaError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("column") && (message.includes("part_a") || message.includes("role") || message.includes("completed"));
}

function escapeCsv(value) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function GET() {
  const session = await getAuthSession();
  if (!isLeaderSession(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: primaryData, error: primaryError } = await db
    .from("survey_responses")
    .select("id, role, completed, created_at, updated_at, part_a, part_b, part_c, part_d")
    .eq("completed", true)
    .order("created_at", { ascending: false });

  let data = primaryData || [];

  if (primaryError && isLegacySurveySchemaError(primaryError)) {
    const { data: legacyData, error: legacyError } = await db
      .from("survey_responses")
      .select("id, created_at, answers")
      .order("created_at", { ascending: false });

    if (legacyError) {
      return NextResponse.json({ error: legacyError.message }, { status: 500 });
    }

    data = (legacyData || [])
      .map((row) => {
        const rawAnswers = row?.answers && typeof row.answers === "object" ? row.answers : {};
        return {
          id: String(row.id),
          role: rawAnswers.role || "unknown",
          completed: Boolean(rawAnswers.completed),
          created_at: row.created_at,
          updated_at: row.created_at,
          part_a: rawAnswers.partA || {},
          part_b: rawAnswers.partB || {},
          part_c: rawAnswers.partC || {},
          part_d: rawAnswers.partD || {},
        };
      })
      .filter((row) => row.completed);
  } else if (primaryError) {
    return NextResponse.json({ error: primaryError.message }, { status: 500 });
  }

  const header = [
    "id",
    "role",
    "completed",
    "created_at",
    "updated_at",
    "part_a_json",
    "part_b_json",
    "part_c_json",
    "part_d_json",
  ];

  const rows = (data || []).map((row) => [
    row.id,
    row.role,
    row.completed,
    row.created_at,
    row.updated_at,
    JSON.stringify(row.part_a || {}),
    JSON.stringify(row.part_b || {}),
    JSON.stringify(row.part_c || {}),
    JSON.stringify(row.part_d || {}),
  ]);

  const csv = [header, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="survey-responses.csv"',
      "Cache-Control": "no-store",
    },
  });
}
