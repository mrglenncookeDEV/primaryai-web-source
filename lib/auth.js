import { cache } from "react";
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

function getSessionTokensFromSupabaseCookieValue(raw) {
  if (!raw) {
    return { accessToken: null, refreshToken: null };
  }

  const parsed = parseSessionCookie(raw);
  if (!parsed) {
    return { accessToken: null, refreshToken: null };
  }

  if (Array.isArray(parsed)) {
    const [accessToken, refreshToken] = parsed;
    return {
      accessToken: typeof accessToken === "string" ? accessToken : null,
      refreshToken: typeof refreshToken === "string" ? refreshToken : null,
    };
  }

  if (typeof parsed === "object") {
    return {
      accessToken: typeof parsed.access_token === "string" ? parsed.access_token : null,
      refreshToken: typeof parsed.refresh_token === "string" ? parsed.refresh_token : null,
    };
  }

  return { accessToken: null, refreshToken: null };
}

export const getAuthSession = cache(async function getAuthSession() {
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
  const tokens = getSessionTokensFromSupabaseCookieValue(tokenCookie?.value);
  const accessToken = tokens.accessToken;

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
    accessToken,
    refreshToken: tokens.refreshToken,
  };
});
