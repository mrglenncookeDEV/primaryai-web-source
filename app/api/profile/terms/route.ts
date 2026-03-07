import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getUserTerms, replaceUserTerms } from "@/lib/user-terms";

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const terms = await getUserTerms(session.userId);
    return NextResponse.json({ ok: true, terms });
  } catch {
    return NextResponse.json({ error: "Profile store unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const terms = Array.isArray(body?.terms) ? body.terms : null;
  if (!terms) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const savedTerms = await replaceUserTerms(session.userId, terms);
    return NextResponse.json({ ok: true, terms: savedTerms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save term dates.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
