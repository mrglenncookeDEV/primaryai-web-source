import { NextResponse } from "next/server";
import { generateLessonPack } from "@/src/engine/orchestrate";
import { LessonPackRequestSchema } from "@/src/engine/schema";

export async function POST(req: Request) {
  const body = await req.json();
  const parsedRequest = LessonPackRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsedRequest.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const pack = await generateLessonPack(parsedRequest.data);
    return NextResponse.json(pack);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
