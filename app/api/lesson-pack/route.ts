import { NextResponse } from "next/server";
import { generateLessonPackWithMeta } from "@/src/engine/orchestrate";
import { LessonPackRequestSchema, LessonPackSchema } from "@/src/engine/schema";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile, toEngineProfile } from "@/lib/user-profile";
import { prisma } from "@/src/db/prisma";

const MIN_CLASS_NOTES_CHARS = 200;

function validPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

export async function POST(req: Request) {
  const start = Date.now();
  const body = await req.json();
  const forceSave = body?.forceSave === true;

  const session = await getCurrentUserSession();
  const userId = session?.userId ?? null;
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in is required to generate lesson packs." },
      { status: 401 },
    );
  }

  const profile = await getOrCreateUserProfile(userId);
  const classNotesLength = profile.classNotes?.trim().length ?? 0;
  if (classNotesLength < MIN_CLASS_NOTES_CHARS) {
    return NextResponse.json(
      {
        error: `Complete "About My Class" in Settings with at least ${MIN_CLASS_NOTES_CHARS} characters before generating lesson packs.`,
      },
      { status: 400 },
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
    return NextResponse.json(
      {
        error: "Complete all required class profile percentages in Settings before generating lesson packs.",
        fields: missingPercentFields,
      },
      { status: 400 },
    );
  }
  const attainmentBandTotal =
    (profile.aboveStandardPercent ?? 0) +
    (profile.belowStandardPercent ?? 0) +
    (profile.hugelyAboveStandardPercent ?? 0) +
    (profile.hugelyBelowStandardPercent ?? 0);
  if (attainmentBandTotal > 100) {
    return NextResponse.json(
      {
        error: "Your attainment percentages cannot exceed 100% in total. Update Settings and try again.",
      },
      { status: 400 },
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
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsedRequest.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const generated = await generateLessonPackWithMeta(parsedRequest.data);
    const pack = generated.pack;

    const latencyMs = Date.now() - start;

    try {
      await prisma.generationLog.create({
        data: {
          userId,
          provider: generated.providerId,
          latencyMs,
          cacheHit: generated.cacheHit,
          success: true,
        },
      });
    } catch {
      // Logging should not block generation.
    }

    const shouldAutoSave = Boolean(userId && (profile?.autoSave || forceSave));
    if (shouldAutoSave) {
      try {
        await prisma.lessonPack.create({
          data: {
            userId,
            title: `${pack.subject} - ${pack.topic}`,
            yearGroup: pack.year_group,
            subject: pack.subject,
            topic: pack.topic,
            json: JSON.stringify(pack),
          },
        });
      } catch {
        // Auto-save should not block generation response.
      }
    }

    return NextResponse.json({ ...pack, _meta: { autoSaved: shouldAutoSave } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    try {
      await prisma.generationLog.create({
        data: {
          userId,
          provider: "none",
          latencyMs: Date.now() - start,
          cacheHit: false,
          success: false,
          reason: message,
        },
      });
    } catch {
      // Best-effort only.
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const parsed = LessonPackSchema.safeParse(body?.pack ?? body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lesson pack payload" }, { status: 400 });
  }

  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const pack = parsed.data;

  const saved = await prisma.lessonPack.create({
    data: {
      userId: session.userId,
      title: `${pack.subject} - ${pack.topic}`,
      yearGroup: pack.year_group,
      subject: pack.subject,
      topic: pack.topic,
      json: JSON.stringify(pack),
    },
  });

  return NextResponse.json({ ok: true, id: saved.id });
}
