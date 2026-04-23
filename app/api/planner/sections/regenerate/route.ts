/**
 * POST /api/planner/sections/regenerate
 *
 * Regenerates a single section of a lesson pack without affecting the others.
 * The teacher can optionally include a short instruction.
 *
 * Body: {
 *   sectionKey: string        — the key to regenerate (e.g. "plenary", "worked_example")
 *   currentPack: object       — the full current lesson pack for context
 *   instruction?: string      — optional teacher instruction ("make this more visual")
 *   planId?: string           — if provided, persists the regenerated content
 *   sectionOrder?: number
 * }
 *
 * Response: { ok: true; value: unknown } | { error: string }
 */

import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { regenerateSection } from "@/src/engine/orchestrate";
import { trackEvent } from "@/lib/planner-telemetry";
import { scanInput, logIntercept } from "@/lib/safeguarding";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  const userId = session?.userId ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: {
    sectionKey: string;
    currentPack: Record<string, unknown>;
    instruction?: string;
    planId?: string;
    sectionOrder?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sectionKey, currentPack, instruction, planId, sectionOrder = 0 } = body;

  if (!sectionKey || !currentPack) {
    return NextResponse.json({ error: "sectionKey and currentPack are required" }, { status: 400 });
  }

  // Safeguarding scan on the instruction field
  if (instruction) {
    const scan = scanInput(instruction);
    if (!scan.safe && scan.category) {
      logIntercept(userId, scan.category);
      return NextResponse.json(
        { error: "SAFEGUARDING_REDIRECT", category: scan.category },
        { status: 422 }
      );
    }
  }

  const patch = await regenerateSection(sectionKey, currentPack, instruction);
  if (!patch) {
    return NextResponse.json({ error: "Regeneration failed — please try again" }, { status: 500 });
  }

  const newValue = patch[sectionKey];

  // If a planId is provided, persist the regenerated section
  if (planId) {
    const contentStr = typeof newValue === "string"
      ? newValue
      : JSON.stringify(newValue);

    await fetch(`${SUPABASE_URL}/rest/v1/plan_sections`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        plan_id: planId,
        section_key: sectionKey,
        section_order: sectionOrder,
        content_md: contentStr,
        rationale_md: "",
        rationale_principles: [],
        state: "revised",
        last_edited_at: new Date().toISOString(),
        regenerated_count: 1,
      }),
    }).catch(() => {});
  }

  // Telemetry
  trackEvent(userId, "section_regenerated", {
    section_key: sectionKey,
    had_instruction: Boolean(instruction),
  }, planId);

  return NextResponse.json({ ok: true, value: newValue });
}
