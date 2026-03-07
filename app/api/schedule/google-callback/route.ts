import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { backfillExistingScheduleEventsToGoogle, storeGoogleConnection, syncGoogleCalendar } from "@/lib/google-sync";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
  const session = await getCurrentUserSession();
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const errorParam = requestUrl.searchParams.get("error");
  const cookieStore = request.headers.get("cookie") || "";
  const stateMatch = cookieStore.match(/(?:^|;\s*)google_oauth_state=([^;]+)/);
  const cookieState = stateMatch?.[1] ? decodeURIComponent(stateMatch[1]) : "";

  function redirectToDashboard(search: string) {
    const response = NextResponse.redirect(new URL(`/dashboard${search}`, baseUrl));
    response.cookies.delete("google_oauth_state");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (!session?.userId) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/dashboard")}`, baseUrl));
  }

  if (errorParam) {
    return redirectToDashboard(`?google=${encodeURIComponent("cancelled")}`);
  }
  if (!state || !cookieState || state !== cookieState) {
    return redirectToDashboard(`?google=${encodeURIComponent("expired")}`);
  }
  if (!code) {
    return redirectToDashboard(`?google=${encodeURIComponent("failed")}`);
  }
  if (!isGoogleCalendarConfigured()) {
    return redirectToDashboard(`?google=${encodeURIComponent("not-configured")}`);
  }

  try {
    await storeGoogleConnection({
      userId: session.userId,
      code,
      baseUrl,
    });
    await syncGoogleCalendar(session.userId);
    await backfillExistingScheduleEventsToGoogle(session.userId);
    return redirectToDashboard(`?google=${encodeURIComponent("connected")}`);
  } catch (error) {
    return redirectToDashboard(`?google=${encodeURIComponent(String((error as Error)?.message || "failed"))}`);
  }
}
