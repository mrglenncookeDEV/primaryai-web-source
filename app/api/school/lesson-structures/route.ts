import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { DEFAULT_LESSON_SECTIONS, getSchoolContext, requireSchool, requireSchoolAdmin } from "@/lib/school-planning";

function cleanSections(value: unknown) {
  const input = Array.isArray(value) && value.length > 0 ? value : DEFAULT_LESSON_SECTIONS;
  return input
    .map((section: any) => ({
      title: String(section?.title || "").trim().slice(0, 120),
      purpose: String(section?.purpose || "").trim().slice(0, 500),
      goodLooksLike: String(section?.goodLooksLike || section?.good_looks_like || "").trim().slice(0, 500),
      prompt: String(section?.prompt || "").trim().slice(0, 500),
    }))
    .filter((section) => section.title);
}

export async function GET() {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;
  const schoolError = requireSchool(ctx);
  if (schoolError) return schoolError;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("school_lesson_structures")
    .select("*")
    .eq("school_id", ctx.schoolId)
    .eq("active", true)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load lesson structures" }, { status: 503 });

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({
      ok: true,
      structures: [
        {
          id: "default",
          name: "Default critical-thinking structure",
          description: "Folville-style foundation topic structure.",
          source: "default",
          sections: DEFAULT_LESSON_SECTIONS,
        },
      ],
    });
  }

  return NextResponse.json({ ok: true, structures: data });
}

export async function POST(req: Request) {
  const ctx = await getSchoolContext();
  if ("error" in ctx) return ctx.error;
  const adminError = requireSchoolAdmin(ctx);
  if (adminError) return adminError;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim().slice(0, 160);
  const description = String(body?.description || "").trim().slice(0, 500) || null;
  const source = String(body?.source || "custom").trim().slice(0, 80) || "custom";
  const sections = cleanSections(body?.sections);

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (sections.length === 0) return NextResponse.json({ error: "At least one section is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("school_lesson_structures")
    .insert({
      school_id: ctx.schoolId,
      name,
      description,
      source,
      sections,
      created_by: ctx.userId,
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not save lesson structure" }, { status: 503 });
  return NextResponse.json({ ok: true, structure: data }, { status: 201 });
}
