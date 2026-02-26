import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseAnonClient() {
  // Accept JWT anon keys (eyJ...) and new publishable keys (sb_publishable_...).
  // If SUPABASE_ANON_KEY holds a secret/service-role key (sb_secret_...) — a common
  // misconfiguration — fall back to the service-role key so auth calls still work.
  const isSecretKey = supabaseAnonKey?.startsWith("sb_secret_");
  const authKey = supabaseAnonKey && !isSecretKey ? supabaseAnonKey : supabaseServiceRoleKey;
  if (!supabaseUrl || !authKey) {
    return null;
  }

  return createClient(supabaseUrl, authKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
