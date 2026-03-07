import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { syncGoogleCalendar } from "@/lib/google-sync";

export async function POST() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await syncGoogleCalendar(session.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || "Could not import Google Calendar events") },
      { status: 503 },
    );
  }
}
