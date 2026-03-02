import { getSupabaseAdminClient } from "@/lib/supabase";

const OPEN_ACCESS_FEATURES = ["public-pages", "dashboard", "core-tools", "advanced-tools", "priority-support"];

const FALLBACK = {
  planName: "free",
  features: OPEN_ACCESS_FEATURES,
};

export async function getEntitlementsForUser(userId) {
  // Temporary MVP override:
  // Keep the current plan label if present, but grant all features to every user.
  if (!userId) {
    return FALLBACK;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return FALLBACK;
  }

  const { data, error } = await supabase
    .from("entitlements")
    .select("plan_name, feature_flags")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return FALLBACK;
  }

  return {
    planName: data.plan_name || "free",
    features: OPEN_ACCESS_FEATURES,
  };
}
