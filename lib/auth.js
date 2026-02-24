import { cookies } from "next/headers";
import { getSupabaseAnonClient } from "@/lib/supabase";

function parseSessionCookie(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAccessTokenFromSupabaseCookieValue(raw) {
  if (!raw) {
    return null;
  }

  const parsed = parseSessionCookie(raw);
  if (!parsed) {
    return null;
  }

  if (Array.isArray(parsed)) {
    const [accessToken] = parsed;
    return typeof accessToken === "string" ? accessToken : null;
  }

  if (typeof parsed === "object" && parsed.access_token) {
    return parsed.access_token;
  }

  return null;
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  const legacyCookie = cookieStore.get("pa_session");

  // Legacy fallback used by earlier scaffold iterations.
  if (legacyCookie?.value) {
    const parsedLegacy = parseSessionCookie(legacyCookie.value);
    if (parsedLegacy?.userId) {
      return parsedLegacy;
    }
  }

  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    return null;
  }

  const allCookies = cookieStore.getAll();
  const tokenCookie = allCookies.find((cookie) => cookie.name.includes("-auth-token"));
  const accessToken = getAccessTokenFromSupabaseCookieValue(tokenCookie?.value);

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email || "",
    role: data.user.role || "authenticated",
  };
}
