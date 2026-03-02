import { NextResponse } from "next/server";
import { getProviderStatus } from "@/src/engine/router";

export async function GET() {
  return NextResponse.json({ ok: true, providers: getProviderStatus() });
}
