import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isLeaderSession } from "@/lib/survey-auth";
import { sendSurveySubmissionEmail } from "@/lib/email";

const ROLE_VALUES = new Set(["teacher", "headteacher", "trustleader", "impartial"]);
const PART_COLUMN = {
  partA: "part_a",
  partB: "part_b",
  partC: "part_c",
  partD: "part_d",
};

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

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

async function sendCompletionEmailAndReport({ responseId, role, completedAt }) {
  try {
    const result = await sendSurveySubmissionEmail({
      responseId,
      role,
      completedAt,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });

    if (result?.skipped) {
      console.warn("Survey completion email skipped", result.reason || "Unknown reason");
      return { emailStatus: "skipped", emailReason: result.reason || "Skipped by provider configuration" };
    }

    return { emailStatus: "sent" };
  } catch (error) {
    console.error("Survey completion email failed", error);
    return { emailStatus: "failed", emailReason: String(error?.message || "Unknown email error") };
  }
}

export async function POST(request) {
  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !ROLE_VALUES.has(body.role) || !PART_COLUMN[body.part] || !isPlainObject(body.answers)) {
    return NextResponse.json({ error: "Invalid survey payload" }, { status: 400 });
  }

  const partColumn = PART_COLUMN[body.part];
  const completed = Boolean(body.completed);

  if (!body.id) {
    const nowIso = new Date().toISOString();
    const insertPayload = {
      role: body.role,
      [partColumn]: body.answers,
      completed,
      updated_at: nowIso,
    };

    const { data, error } = await db
      .from("survey_responses")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error && isLegacySurveySchemaError(error)) {
      const legacyAnswers = {
        role: body.role,
        partA: body.part === "partA" ? body.answers : {},
        partB: body.part === "partB" ? body.answers : {},
        partC: body.part === "partC" ? body.answers : {},
        partD: body.part === "partD" ? body.answers : {},
        completed,
      };

      const { data: legacyData, error: legacyError } = await db
        .from("survey_responses")
        .insert({
          survey_slug: "primaryai-educator-survey",
          answers: legacyAnswers,
        })
        .select("id")
        .single();

      if (legacyError) {
        return NextResponse.json({ error: legacyError.message }, { status: 500 });
      }

      if (completed) {
        const email = await sendCompletionEmailAndReport({
          responseId: String(legacyData.id),
          role: body.role,
          completedAt: nowIso,
        });
        return NextResponse.json({ id: String(legacyData.id), ...email });
      }

      return NextResponse.json({ id: String(legacyData.id) });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (completed) {
      const email = await sendCompletionEmailAndReport({
        responseId: data.id,
        role: body.role,
        completedAt: nowIso,
      });
      return NextResponse.json({ id: data.id, ...email });
    }

    return NextResponse.json({ id: data.id });
  }

  let wasCompleted = false;
  if (completed) {
    const { data: existing } = await db
      .from("survey_responses")
      .select("completed")
      .eq("id", body.id)
      .maybeSingle();
    wasCompleted = Boolean(existing?.completed);
  }

  const nowIso = new Date().toISOString();
  const updatePayload = {
    [partColumn]: body.answers,
    updated_at: nowIso,
  };

  if (completed) {
    updatePayload.completed = true;
  }

  const { data, error } = await db
    .from("survey_responses")
    .update(updatePayload)
    .eq("id", body.id)
    .select("id")
    .maybeSingle();

  if (error && isLegacySurveySchemaError(error)) {
    const { data: currentLegacy, error: legacyFetchError } = await db
      .from("survey_responses")
      .select("id, answers")
      .eq("id", body.id)
      .maybeSingle();

    if (legacyFetchError) {
      return NextResponse.json({ error: legacyFetchError.message }, { status: 500 });
    }

    if (!currentLegacy) {
      return NextResponse.json({ error: "Survey response not found" }, { status: 404 });
    }

    const existingAnswers =
      currentLegacy.answers && typeof currentLegacy.answers === "object" ? currentLegacy.answers : {};

    const mergedAnswers = {
      ...existingAnswers,
      role: existingAnswers.role || body.role,
      [body.part]: body.answers,
      completed: completed ? true : Boolean(existingAnswers.completed),
    };

    const { data: updatedLegacy, error: legacyUpdateError } = await db
      .from("survey_responses")
      .update({ answers: mergedAnswers })
      .eq("id", body.id)
      .select("id")
      .maybeSingle();

    if (legacyUpdateError) {
      return NextResponse.json({ error: legacyUpdateError.message }, { status: 500 });
    }

    if (!updatedLegacy) {
      return NextResponse.json({ error: "Survey response not found" }, { status: 404 });
    }

    if (completed && !wasCompleted) {
      const email = await sendCompletionEmailAndReport({
        responseId: String(updatedLegacy.id),
        role: body.role,
        completedAt: nowIso,
      });
      return NextResponse.json({ id: String(updatedLegacy.id), ...email });
    }

    return NextResponse.json({ id: String(updatedLegacy.id) });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Survey response not found" }, { status: 404 });
  }

  if (completed && !wasCompleted) {
    const email = await sendCompletionEmailAndReport({
      responseId: data.id,
      role: body.role,
      completedAt: nowIso,
    });
    return NextResponse.json({ id: data.id, ...email });
  }

  return NextResponse.json({ id: data.id });
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

  const { data, error } = await db
    .from("survey_responses")
    .select("*")
    .eq("completed", true)
    .order("created_at", { ascending: false });

  if (error && isLegacySurveySchemaError(error)) {
    const { data: legacyData, error: legacyError } = await db
      .from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false });

    if (legacyError) {
      return NextResponse.json({ error: legacyError.message }, { status: 500 });
    }

    const rows = (legacyData || []).map(mapLegacyRowToModern).filter((row) => row.completed);
    return NextResponse.json({ rows });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data || [] });
}
