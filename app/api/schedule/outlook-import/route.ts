import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { syncOutlookCalendar } from "@/lib/outlook-sync";

export async function POST() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await syncOutlookCalendar(session.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || "Could not import Outlook events") },
      { status: 503 },
    );
  }
}
