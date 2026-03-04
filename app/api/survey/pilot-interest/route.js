import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const surveyResponseId = String(body?.surveyResponseId || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();

  if (!surveyResponseId || !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { error } = await db
    .from("pilot_interest")
    .upsert({ survey_response_id: surveyResponseId, email }, { onConflict: "survey_response_id,email" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
