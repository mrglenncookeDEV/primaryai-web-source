import { getCurrentUserSession } from "@/lib/user-session";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type SchoolContext = {
  userId: string;
  schoolId: string | null;
  schoolRole: string | null;
};

export const DEFAULT_LESSON_SECTIONS = [
  {
    title: "Retrieval practice / daily review",
    purpose: "Reactivate prior knowledge and reveal gaps before new learning.",
    goodLooksLike: "Pupils answer short, targeted questions linked to prior knowledge.",
    prompt: "What do pupils need to remember before today's learning can make sense?",
  },
  {
    title: "Our learning journey",
    purpose: "Locate today's lesson in the unit sequence.",
    goodLooksLike: "Pupils can explain where this learning fits and why it matters.",
    prompt: "What have pupils already learned, and what comes next?",
  },
  {
    title: "Learning objective",
    purpose: "Make the intended learning precise and assessable.",
    goodLooksLike: "The objective describes what pupils will know or do by the end.",
    prompt: "What is the smallest meaningful learning step for this lesson?",
  },
  {
    title: "Vocabulary pre-teach / check",
    purpose: "Remove language barriers before new content.",
    goodLooksLike: "Key words are defined, rehearsed, and used in context.",
    prompt: "Which words will block understanding if they are not taught first?",
  },
  {
    title: "New learning",
    purpose: "Teach and model the new concept explicitly.",
    goodLooksLike: "The teacher models the thinking, checks understanding, and corrects misconceptions.",
    prompt: "What exact explanation, model, or representation will move pupils forward?",
  },
  {
    title: "I do, we do, you do",
    purpose: "Move from modelled practice to guided and independent application.",
    goodLooksLike: "Pupils practise with decreasing support and clear success criteria.",
    prompt: "How will support be faded without leaving pupils guessing?",
  },
  {
    title: "Proof-reading",
    purpose: "Build accuracy and independent checking habits.",
    goodLooksLike: "Pupils check a small, relevant part of their work against a clear criterion.",
    prompt: "What should pupils check before they think they are finished?",
  },
  {
    title: "Oracy / talking point / big question",
    purpose: "Use talk to deepen reasoning and reveal misconceptions.",
    goodLooksLike: "Pupils explain, justify, challenge, or build on ideas using sentence stems.",
    prompt: "What question will force pupils to reason aloud?",
  },
  {
    title: "Review",
    purpose: "Gather evidence of learning and set up the next lesson.",
    goodLooksLike: "The teacher can see who is secure, who needs more practice, and what to do next.",
    prompt: "What evidence will show whether today's learning landed?",
  },
];

export function normaliseStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function getSchoolContext(): Promise<SchoolContext | { error: Response }> {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return {
      error: Response.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      error: Response.json({ error: "Store unavailable" }, { status: 503 }),
    };
  }

  const { data } = await supabase
    .from("user_profile_settings")
    .select("school_id, school_role")
    .eq("user_id", session.userId)
    .maybeSingle();

  return {
    userId: session.userId,
    schoolId: data?.school_id ? String(data.school_id) : null,
    schoolRole: data?.school_role ? String(data.school_role) : null,
  };
}

export function isAdmin(ctx: SchoolContext) {
  return ctx.schoolRole === "admin";
}

export function requireSchool(ctx: SchoolContext) {
  if (!ctx.schoolId) {
    return Response.json({ error: "Create or join a school first." }, { status: 409 });
  }
  return null;
}

export function requireSchoolAdmin(ctx: SchoolContext) {
  const schoolError = requireSchool(ctx);
  if (schoolError) return schoolError;
  if (!isAdmin(ctx)) {
    return Response.json({ error: "Only school admins can change this." }, { status: 403 });
  }
  return null;
}
