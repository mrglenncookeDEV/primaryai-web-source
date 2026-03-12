import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { exchangeMicrosoftCode, fetchMicrosoftProfile, isOutlookConfigured } from "@/lib/outlook-calendar";
import { backfillExistingScheduleEventsToOutlook, syncOutlookCalendar } from "@/lib/outlook-sync";
import { formatSupabaseError, isMissingRelationError } from "@/lib/supabase-errors";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
  const session = await getCurrentUserSession();
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const errorParam = requestUrl.searchParams.get("error");
  const cookieStore = request.headers.get("cookie") || "";
  const stateMatch = cookieStore.match(/(?:^|;\s*)outlook_oauth_state=([^;]+)/);
  const cookieState = stateMatch?.[1] ? decodeURIComponent(stateMatch[1]) : "";

  function redirectToDashboard(search: string) {
    const response = NextResponse.redirect(new URL(`/dashboard${search}`, baseUrl));
    response.cookies.delete("outlook_oauth_state");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (!session?.userId) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/dashboard")}`, baseUrl));
  }

  if (errorParam) {
    return redirectToDashboard(`?outlook=${encodeURIComponent("cancelled")}`);
  }

  if (!state || !cookieState || state !== cookieState) {
    return redirectToDashboard(`?outlook=${encodeURIComponent("expired")}`);
  }

  if (!code) {
    return redirectToDashboard(`?outlook=${encodeURIComponent("failed")}`);
  }

  if (!isOutlookConfigured()) {
    return redirectToDashboard(`?outlook=${encodeURIComponent("not-configured")}`);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return redirectToDashboard(`?outlook=${encodeURIComponent("store-unavailable")}`);
  }

  try {
    const tokenData = await exchangeMicrosoftCode({ code, baseUrl });
    const accessToken = String(tokenData.access_token || "");
    const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null;
    const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString();
    const profile = await fetchMicrosoftProfile(accessToken);

    const { error } = await supabase.from("outlook_calendar_connections").upsert(
      {
        user_id: session.userId,
        microsoft_user_id: String(profile?.id || ""),
        email: String(profile?.mail || profile?.userPrincipalName || ""),
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: typeof tokenData.scope === "string" ? tokenData.scope : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      const missingTable = isMissingRelationError(error, "outlook_calendar_connections");
      throw new Error(
        missingTable
          ? "Outlook sync is not ready yet. Run migration 021_outlook_calendar_sync.sql first."
          : formatSupabaseError(error, "Could not store Outlook connection"),
      );
    }

    await syncOutlookCalendar(session.userId);
    await backfillExistingScheduleEventsToOutlook(session.userId);
    return redirectToDashboard(`?outlook=${encodeURIComponent("connected")}`);
  } catch (error) {
    return redirectToDashboard(`?outlook=${encodeURIComponent(String((error as Error)?.message || "failed"))}`);
  }
}
