import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

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
  const subject    = searchParams.get("subject");
  const keyStage   = searchParams.get("keyStage");
  const yearGroup  = searchParams.get("yearGroup");

  let query = supabase
    .from("nc_objectives")
    .select("id,key_stage,year_group,subject,strand,code,description")
    .order("subject")
    .order("strand")
    .order("code");

  if (subject)   query = query.ilike("subject", subject);
  if (keyStage)  query = query.eq("key_stage", keyStage.toLowerCase());
  if (yearGroup) query = query.in("year_group", [yearGroup.toLowerCase(), keyStage?.toLowerCase() ?? ""]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not fetch objectives" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, objectives: Array.isArray(data) ? data : [] });
}
