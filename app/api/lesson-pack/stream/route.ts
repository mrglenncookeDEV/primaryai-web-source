import { generateLessonPackWithMeta } from "@/src/engine/orchestrate";
import { LessonPackRequestSchema } from "@/src/engine/schema";
import type { EngineEvent } from "@/src/engine/types";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile, toEngineProfile } from "@/lib/user-profile";

const MIN_CLASS_NOTES_CHARS = 200;

function validPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

export async function POST(req: Request) {
  const body = await req.json();

  const session = await getCurrentUserSession();
  const userId = session?.userId ?? null;
  if (!userId) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Sign in is required to generate lesson packs." })}\n\n`,
      { status: 401, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const profile = await getOrCreateUserProfile(userId);
  const classNotesLength = profile.classNotes?.trim().length ?? 0;
  if (classNotesLength < MIN_CLASS_NOTES_CHARS) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: `Complete "About My Class" in Settings with at least ${MIN_CLASS_NOTES_CHARS} characters before generating lesson packs.` })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const requiredPercentFields = {
    ealPercent: profile.ealPercent,
    pupilPremiumPercent: profile.pupilPremiumPercent,
    aboveStandardPercent: profile.aboveStandardPercent,
    belowStandardPercent: profile.belowStandardPercent,
    hugelyAboveStandardPercent: profile.hugelyAboveStandardPercent,
    hugelyBelowStandardPercent: profile.hugelyBelowStandardPercent,
  };
  const missingPercentFields = Object.entries(requiredPercentFields)
    .filter(([, value]) => !validPercent(value))
    .map(([key]) => key);
  if (missingPercentFields.length > 0) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Complete all required class profile percentages in Settings before generating lesson packs." })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const mergedBody = {
    ...body,
    year_group: String(body?.year_group || profile?.defaultYearGroup || ""),
    subject: String(body?.subject || profile?.defaultSubject || ""),
    profile: profile ? toEngineProfile(profile) : undefined,
  };

  const parsedRequest = LessonPackRequestSchema.safeParse(mergedBody);
  if (!parsedRequest.success) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Invalid request" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = (
    event:
      | EngineEvent
      | { type: "pack"; pack: unknown; providerId: string; cacheHit: boolean; meta?: unknown }
  ) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      // Client disconnected — ignore write errors
    }
  };

  // Run generation in background so we can return the stream immediately
  void (async () => {
    try {
      const result = await generateLessonPackWithMeta(parsedRequest.data, (event) => send(event));
      send({
        type: "pack",
        pack: result.pack,
        providerId: result.providerId,
        cacheHit: result.cacheHit,
        meta: result.meta,
      });
    } catch (err) {
      send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      try { writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
