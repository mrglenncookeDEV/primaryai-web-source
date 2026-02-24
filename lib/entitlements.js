import { getSupabaseAdminClient } from "@/lib/supabase";

const FALLBACK = {
  planName: "free",
  features: ["public-pages"],
};

export async function getEntitlementsForUser(userId) {
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
    features: Array.isArray(data.feature_flags) ? data.feature_flags : ["public-pages"],
  };
}
