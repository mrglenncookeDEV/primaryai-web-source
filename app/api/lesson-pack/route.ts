export const runtime = 'edge';
import { NextResponse } from "next/server";
import { generateLessonPackWithMeta } from "@/src/engine/orchestrate";
import { LessonPackRequestSchema, LessonPackSchema } from "@/src/engine/schema";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile, toEngineProfile } from "@/lib/user-profile";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { scanInput, logIntercept } from "@/lib/safeguarding";
import { trackEvent } from "@/lib/planner-telemetry";

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

  // ── Safeguarding scan ─────────────────────────────────────────────────────
  // Scan all free-text teacher input before it reaches any model.
  // If flagged: log the category (never the content) and return a redirect signal.
  const inputsToScan = [
    parsedRequest.data.topic ?? "",
    parsedRequest.data.context_notes ?? "",
    parsedRequest.data.feedback ?? "",
  ].join(" ");

  const safeguardingResult = scanInput(inputsToScan);
  if (!safeguardingResult.safe && safeguardingResult.category) {
    logIntercept(userId, safeguardingResult.category);
    trackEvent(userId, "planner_safeguarding_intercept", {
      matched_category: safeguardingResult.category,
    });
    return NextResponse.json(
      { error: "SAFEGUARDING_REDIRECT", category: safeguardingResult.category },
      { status: 422 }
    );
  }

  // ── Telemetry: submitted ──────────────────────────────────────────────────
  trackEvent(userId, "planner_submitted", {
    year_group: parsedRequest.data.year_group,
    subject: parsedRequest.data.subject,
    topic: parsedRequest.data.topic,
    objective_length: parsedRequest.data.topic?.length ?? 0,
  });

  try {
    const generated = await generateLessonPackWithMeta(parsedRequest.data);
    const pack = generated.pack;

    const latencyMs = Date.now() - start;

    try {
      const db = getSupabaseAdminClient();
      await db?.from("generation_logs").insert({
        user_id: userId,
        provider: generated.providerId,
        latency_ms: latencyMs,
        cache_hit: generated.cacheHit,
        success: true,
      });
    } catch {
      // Logging should not block generation.
    }

    // ── Telemetry: plan ready ─────────────────────────────────────────────
    trackEvent(userId, "plan_ready", {
      total_duration_ms: latencyMs,
    });

    const shouldAutoSave = Boolean(userId && (profile?.autoSave || forceSave));
    let savedPlanId: string | undefined;
    if (shouldAutoSave) {
      try {
        const db = getSupabaseAdminClient();
        const { data: saved } = await db!.from("lesson_packs").insert({
          user_id: userId,
          title: `${pack.subject} - ${pack.topic}`,
          year_group: pack.year_group,
          subject: pack.subject,
          topic: pack.topic,
          json: JSON.stringify(pack),
        }).select("id").single();
        savedPlanId = saved?.id;
      } catch {
        // Auto-save should not block generation response.
      }
    }

    return NextResponse.json({
      ...pack,
      _meta: {
        ...(generated.meta ?? {}),
        autoSaved: shouldAutoSave,
        planId: savedPlanId ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    try {
      const db = getSupabaseAdminClient();
      await db?.from("generation_logs").insert({
        user_id: userId,
        provider: "none",
        latency_ms: Date.now() - start,
        cache_hit: false,
        success: false,
        reason: message,
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

  const db = getSupabaseAdminClient();
  const { data: saved, error } = await db!.from("lesson_packs").insert({
    user_id: session.userId,
    title: `${pack.subject} - ${pack.topic}`,
    year_group: pack.year_group,
    subject: pack.subject,
    topic: pack.topic,
    json: JSON.stringify(pack),
  }).select("id").single();

  if (error) return NextResponse.json({ error: "Failed to save lesson pack" }, { status: 500 });
  return NextResponse.json({ ok: true, id: saved.id });
}
