import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getOrCreateUserProfile, toEngineProfile } from "@/lib/user-profile";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateLessonPackWithMeta } from "@/src/engine/orchestrate";
import { LessonPackRequestSchema } from "@/src/engine/schema";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });

  // Get the schedule event
  const { data: event, error: eventError } = await supabase
    .from("lesson_schedule")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: "Schedule event not found" }, { status: 404 });
  }

  if (event.lesson_pack_id) {
    return NextResponse.json({ error: "This event already has a lesson pack linked" }, { status: 409 });
  }

  const profile = await getOrCreateUserProfile(session.userId);

  const requestBody = {
    year_group: event.year_group || profile.defaultYearGroup || "Year 4",
    subject: event.subject || profile.defaultSubject || "Maths",
    topic: event.title || event.subject,
    profile: profile ? toEngineProfile(profile) : undefined,
  };

  const parsedRequest = LessonPackRequestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Could not build lesson pack request from event data" }, { status: 400 });
  }

  try {
    const generated = await generateLessonPackWithMeta(parsedRequest.data);
    const pack = generated.pack;

    // Save the lesson pack
    const { data: savedPack, error: packError } = await supabase
      .from("lesson_packs")
      .insert({
        user_id: session.userId,
        title: `${pack.subject} - ${pack.topic}`,
        year_group: pack.year_group,
        subject: pack.subject,
        topic: pack.topic,
        json: JSON.stringify(pack),
      })
      .select()
      .single();

    if (packError || !savedPack) {
      return NextResponse.json({ error: "Could not save generated lesson pack" }, { status: 503 });
    }

    // Link the pack to the schedule event
    await supabase
      .from("lesson_schedule")
      .update({ lesson_pack_id: savedPack.id })
      .eq("id", id)
      .eq("user_id", session.userId);

    return NextResponse.json({ ok: true, packId: savedPack.id, pack });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-pack error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
