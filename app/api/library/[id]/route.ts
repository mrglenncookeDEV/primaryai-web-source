import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  const { error } = await supabase
    .from("lesson_packs")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Library store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
