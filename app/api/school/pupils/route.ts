import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getSchoolContext, normaliseStringArray } from "@/lib/school-planning";

export async function GET() {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("class_pupil_profiles")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("active", true)
    .order("pseudonym", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load pupil profiles" }, { status: 503 });
  return NextResponse.json({ ok: true, pupils: Array.isArray(data) ? data : [] });
}

export async function POST(req: Request) {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const pseudonym = String(body?.pseudonym || "").trim().slice(0, 80);
  if (!pseudonym) return NextResponse.json({ error: "Pseudonym is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("class_pupil_profiles")
    .upsert(
      {
        user_id: ctx.userId,
        school_id: ctx.schoolId,
        pseudonym,
        year_group: String(body?.yearGroup || body?.year_group || "").trim().slice(0, 40) || null,
        home_languages: normaliseStringArray(body?.homeLanguages || body?.home_languages),
        eal_stage: String(body?.ealStage || body?.eal_stage || "").trim().slice(0, 80) || null,
        send_needs: normaliseStringArray(body?.sendNeeds || body?.send_needs),
        attainment: String(body?.attainment || "").trim().slice(0, 120) || null,
        reading_age: String(body?.readingAge || body?.reading_age || "").trim().slice(0, 80) || null,
        interests: String(body?.interests || "").trim().slice(0, 1000) || null,
        current_next_step: String(body?.currentNextStep || body?.current_next_step || "").trim().slice(0, 1000) || null,
        notes: String(body?.notes || "").trim().slice(0, 1500) || null,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pseudonym" },
    )
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not save pupil profile" }, { status: 503 });
  return NextResponse.json({ ok: true, pupil: data }, { status: 201 });
}
