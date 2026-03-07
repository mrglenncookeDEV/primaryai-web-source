import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { getGoogleSyncStatus } from "@/lib/google-sync";

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const status = await getGoogleSyncStatus(session.userId);
    return NextResponse.json({ ok: true, configured: isGoogleCalendarConfigured(), ...status });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || "Could not load Google Calendar sync status") },
      { status: 503 },
    );
  }
}
