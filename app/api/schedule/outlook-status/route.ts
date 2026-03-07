import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { isOutlookConfigured } from "@/lib/outlook-calendar";
import { getOutlookSyncStatus } from "@/lib/outlook-sync";

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const status = await getOutlookSyncStatus(session.userId);
    return NextResponse.json({ ok: true, configured: isOutlookConfigured(), ...status });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || "Could not load Outlook sync status") },
      { status: 503 },
    );
  }
}
