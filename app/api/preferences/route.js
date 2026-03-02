import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

const VALID_THEMES   = new Set(["dark", "light"]);
const VALID_PALETTES = new Set(["duck-egg", "sage", "lavender", "rose", "slate", "sand"]);

export async function GET() {
  const session = await getAuthSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json(null);

  const { data } = await db
    .from("user_preferences")
    .select("theme, palette")
    .eq("user_id", session.userId)
    .maybeSingle();

  // Return null when no row exists — client keeps its localStorage values
  // rather than overwriting them with server-side defaults.
  if (!data) return NextResponse.json(null);

  return NextResponse.json({ theme: data.theme, palette: data.palette });
}

export async function POST(request) {
  const session = await getAuthSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const theme   = VALID_THEMES.has(body.theme)     ? body.theme   : undefined;
  const palette = VALID_PALETTES.has(body.palette) ? body.palette : undefined;

  if (!theme && !palette) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ ok: true });

  // Read current values so we always write a complete row
  const { data: existing } = await db
    .from("user_preferences")
    .select("theme, palette")
    .eq("user_id", session.userId)
    .maybeSingle();

  await db.from("user_preferences").upsert({
    user_id:    session.userId,
    theme:      theme   ?? existing?.theme   ?? "dark",
    palette:    palette ?? existing?.palette ?? "duck-egg",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}
