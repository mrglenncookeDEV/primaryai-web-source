import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No active session" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, session });
}
