import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { formatSupabaseError, isMissingRelationError } from "@/lib/supabase-errors";
import { getSupabaseAdminClient } from "@/lib/supabase";

function createToken() {
  return `${crypto.randomUUID().replace(/-/g, "")}${Date.now().toString(36)}`;
}

export async function GET(request: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Sync store unavailable" }, { status: 503 });
  }

  const { data: existing, error: readError } = await supabase
    .from("calendar_sync_tokens")
    .select("token")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (readError) {
    const missingTable = isMissingRelationError(readError, "calendar_sync_tokens");
    return NextResponse.json(
      {
        error: missingTable
          ? "Outlook sync is not ready yet. Run migration 017_calendar_sync_tokens.sql first."
          : formatSupabaseError(readError, "Sync store unavailable"),
      },
      { status: 503 },
    );
  }

  const token = existing?.token || createToken();
  if (!existing?.token) {
    const { error: writeError } = await supabase
      .from("calendar_sync_tokens")
      .upsert(
        {
          user_id: session.userId,
          token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (writeError) {
      const missingTable = isMissingRelationError(writeError, "calendar_sync_tokens");
      return NextResponse.json(
        {
          error: missingTable
            ? "Outlook sync is not ready yet. Run migration 017_calendar_sync_tokens.sql first."
            : formatSupabaseError(writeError, "Sync store unavailable"),
        },
        { status: 503 },
      );
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const icsUrl = `${baseUrl.replace(/\/$/, "")}/api/calendar/ics/${encodeURIComponent(token)}`;
  const webcalUrl = icsUrl.replace(/^https?/i, "webcal");
  const outlookSubscribeUrl = `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(
    icsUrl,
  )}&name=${encodeURIComponent("PrimaryAI Schedule")}`;

  return NextResponse.json({
    ok: true,
    icsUrl,
    webcalUrl,
    outlookSubscribeUrl,
  });
}
