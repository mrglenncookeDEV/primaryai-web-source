import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isLegacySurveySchemaError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("column") && (message.includes("part_a") || message.includes("role") || message.includes("completed"));
}

function mapLegacyRowToModern(row) {
  const rawAnswers = row?.answers && typeof row.answers === "object" ? row.answers : {};
  return {
    id: String(row.id),
    role: rawAnswers.role || "unknown",
    part_a: rawAnswers.partA || {},
    part_b: rawAnswers.partB || {},
    part_c: rawAnswers.partC || {},
    part_d: rawAnswers.partD || {},
    completed: Boolean(rawAnswers.completed),
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing survey id" }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data, error } = await db
    .from("survey_responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error && isLegacySurveySchemaError(error)) {
    const { data: legacyData, error: legacyError } = await db
      .from("survey_responses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (legacyError) {
      return NextResponse.json({ error: legacyError.message }, { status: 500 });
    }

    if (!legacyData) {
      return NextResponse.json({ error: "Survey response not found" }, { status: 404 });
    }

    return NextResponse.json(mapLegacyRowToModern(legacyData));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Survey response not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
