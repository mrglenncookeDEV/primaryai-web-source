import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile, updateUserProfile } from "@/lib/user-profile";

function toNullablePercent(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  if (rounded < 0 || rounded > 100) return undefined;
  return rounded;
}

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const profile = await getOrCreateUserProfile(session.userId);
    return NextResponse.json({ ok: true, profile });
  } catch {
    return NextResponse.json({ error: "Profile store unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const profile = await updateUserProfile(session.userId, {
      defaultYearGroup: typeof body?.defaultYearGroup === "string" ? body.defaultYearGroup : undefined,
      defaultSubject: typeof body?.defaultSubject === "string" ? body.defaultSubject : undefined,
      tone: typeof body?.tone === "string" ? body.tone : undefined,
      schoolType: typeof body?.schoolType === "string" ? body.schoolType : undefined,
      sendFocus: typeof body?.sendFocus === "boolean" ? body.sendFocus : undefined,
      autoSave: typeof body?.autoSave === "boolean" ? body.autoSave : undefined,
      formatPrefs: typeof body?.formatPrefs === "string" ? body.formatPrefs : undefined,
      classNotes: typeof body?.classNotes === "string" ? body.classNotes : (body?.classNotes === null ? null : undefined),
      teachingApproach: typeof body?.teachingApproach === "string" ? body.teachingApproach : undefined,
      abilityMix: typeof body?.abilityMix === "string" ? body.abilityMix : undefined,
      ealPercent: toNullablePercent(body?.ealPercent),
      pupilPremiumPercent: toNullablePercent(body?.pupilPremiumPercent),
      aboveStandardPercent: toNullablePercent(body?.aboveStandardPercent),
      belowStandardPercent: toNullablePercent(body?.belowStandardPercent),
      hugelyAboveStandardPercent: toNullablePercent(body?.hugelyAboveStandardPercent),
      hugelyBelowStandardPercent: toNullablePercent(body?.hugelyBelowStandardPercent),
    });

    return NextResponse.json({ ok: true, profile });
  } catch {
    return NextResponse.json({ error: "Profile store unavailable" }, { status: 503 });
  }
}
