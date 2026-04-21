import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

// Returns per-subject/strand coverage counts for a given year_group + date range
export async function GET(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Store unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const yearGroup = searchParams.get("yearGroup") ?? "";
  const from      = searchParams.get("from") ?? "";
  const to        = searchParams.get("to") ?? "";

  if (!yearGroup) {
    return NextResponse.json({ error: "yearGroup is required" }, { status: 400 });
  }

  // All objectives for this year group (and its key-stage-wide objectives)
  const ks = yearGroup.startsWith("year-") ? (parseInt(yearGroup.replace("year-", ""), 10) <= 2 ? "ks1" : "ks2") : yearGroup;
  const { data: allObjectives } = await supabase
    .from("nc_objectives")
    .select("id,subject,strand,code,description,year_group,key_stage")
    .in("year_group", [yearGroup, ks])
    .order("subject")
    .order("strand")
    .order("code");

  const objectives = Array.isArray(allObjectives) ? allObjectives : [];
  const objectiveIds = objectives.map((o) => o.id);

  if (objectiveIds.length === 0) {
    return NextResponse.json({ ok: true, coverage: [], yearGroup });
  }

  // Taught links (optionally filtered by date range via lesson_schedule join)
  let linksQuery = supabase
    .from("lesson_objective_links")
    .select("objective_id, schedule_event_id, lesson_schedule!inner(scheduled_date)")
    .eq("user_id", session.userId)
    .in("objective_id", objectiveIds);

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    linksQuery = linksQuery.gte("lesson_schedule.scheduled_date", from);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    linksQuery = linksQuery.lte("lesson_schedule.scheduled_date", to);
  }

  const { data: links } = await linksQuery;
  const taughtIds = new Set((Array.isArray(links) ? links : []).map((l) => l.objective_id));

  // Group by subject → strand
  type StrandGroup = {
    strand: string;
    total: number;
    taught: number;
    objectives: { id: string; code: string; description: string; taught: boolean }[];
  };
  type SubjectGroup = { subject: string; total: number; taught: number; strands: StrandGroup[] };

  const subjectMap: Record<string, SubjectGroup> = {};
  for (const obj of objectives) {
    if (!subjectMap[obj.subject]) {
      subjectMap[obj.subject] = { subject: obj.subject, total: 0, taught: 0, strands: [] };
    }
    const subj = subjectMap[obj.subject];
    let strand = subj.strands.find((s) => s.strand === obj.strand);
    if (!strand) {
      strand = { strand: obj.strand, total: 0, taught: 0, objectives: [] };
      subj.strands.push(strand);
    }
    const taught = taughtIds.has(obj.id);
    strand.objectives.push({ id: obj.id, code: obj.code, description: obj.description, taught });
    strand.total++;
    subj.total++;
    if (taught) { strand.taught++; subj.taught++; }
  }

  return NextResponse.json({
    ok: true,
    yearGroup,
    coverage: Object.values(subjectMap),
  });
}
