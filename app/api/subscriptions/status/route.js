import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getEntitlementsForUser } from "@/lib/entitlements";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const entitlements = await getEntitlementsForUser(session.userId);
  return NextResponse.json({ ok: true, user: session, entitlements });
}
