import { NextResponse } from "next/server";
import { generateLessonPack } from "@/src/engine/orchestrate";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const pack = await generateLessonPack(body);
    return NextResponse.json(pack);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
