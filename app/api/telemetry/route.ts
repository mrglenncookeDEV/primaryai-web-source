import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  const body = await req.json().catch(() => ({}));
  const event = typeof body?.event === "string" ? body.event.trim() : "";
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

  if (!event) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  console.log("app-telemetry", {
    userId: session?.userId ?? null,
    event,
    payload,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
