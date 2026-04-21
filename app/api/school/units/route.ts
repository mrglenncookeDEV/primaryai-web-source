import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getSchoolContext, requireSchool, requireSchoolAdmin } from "@/lib/school-planning";

function cleanJsonList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item && typeof item === "object") return item;
      const text = String(item || "").trim();
      return text ? { text } : null;
    })
    .filter(Boolean);
}

export async function GET(req: Request) {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;
  const schoolError = requireSchool(ctx);
  if (schoolError) return schoolError;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const yearGroup = searchParams.get("yearGroup");
  const subject = searchParams.get("subject");

  let query = supabase
    .from("school_unit_plans")
    .select("*")
    .eq("school_id", ctx.schoolId)
    .eq("active", true)
    .order("updated_at", { ascending: false });

  if (yearGroup) query = query.eq("year_group", yearGroup);
  if (subject) query = query.eq("subject", subject);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load unit plans" }, { status: 503 });
  return NextResponse.json({ ok: true, units: Array.isArray(data) ? data : [] });
}

export async function POST(req: Request) {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;
  const adminError = requireSchoolAdmin(ctx);
  if (adminError) return adminError;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const yearGroup = String(body?.yearGroup || body?.year_group || "").trim().slice(0, 40);
  const subject = String(body?.subject || "").trim().slice(0, 80);
  const title = String(body?.title || "").trim().slice(0, 180);

  if (!yearGroup || !subject || !title) {
    return NextResponse.json({ error: "Year group, subject and title are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("school_unit_plans")
    .insert({
      school_id: ctx.schoolId,
      year_group: yearGroup,
      subject,
      term: String(body?.term || "").trim().slice(0, 80) || null,
      title,
      unit_summary: String(body?.unitSummary || body?.unit_summary || "").trim().slice(0, 4000) || null,
      experiences: String(body?.experiences || "").trim().slice(0, 3000) || null,
      end_points: String(body?.endPoints || body?.end_points || "").trim().slice(0, 3000) || null,
      vocabulary: cleanJsonList(body?.vocabulary),
      progression: cleanJsonList(body?.progression),
      source_document_name: String(body?.sourceDocumentName || body?.source_document_name || "").trim().slice(0, 240) || null,
      source_text: String(body?.sourceText || body?.source_text || "").trim().slice(0, 12000) || null,
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not save unit plan" }, { status: 503 });
  return NextResponse.json({ ok: true, unit: data }, { status: 201 });
}
