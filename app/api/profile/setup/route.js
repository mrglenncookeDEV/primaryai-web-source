import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";
import { getProfileSetup, saveProfileSetup } from "@/lib/profile-setup";

export async function GET() {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const profileSetup = await getProfileSetup(session.userId);
    return NextResponse.json({ ok: true, profileSetup });
  } catch {
    return NextResponse.json({ error: "Profile store unavailable" }, { status: 503 });
  }
}

export async function POST(request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const displayName = String(body?.displayName || "").trim();
  const avatarUrl = String(body?.avatarUrl || "").trim();
  const profileCompleted = typeof body?.profileCompleted === "boolean" ? body.profileCompleted : undefined;
  if (avatarUrl.length > 400_000) {
    return NextResponse.json(
      { error: "Profile image is too large. Please upload a smaller image." },
      { status: 413 },
    );
  }

  try {
    const current = await getProfileSetup(session.userId);
    const fallbackFromEmail = String(session.email || "").split("@")[0] || "";
    const resolvedDisplayName = displayName || current.displayName || fallbackFromEmail;

    const profileSetup = await saveProfileSetup(session.userId, {
      displayName: resolvedDisplayName,
      avatarUrl,
    }, {
      accessToken: session.accessToken,
      profileCompleted,
    });
    const response = NextResponse.json({ ok: true, profileSetup });
    response.cookies.set("pa_profile_complete", profileSetup.profileCompleted ? "1" : "0", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Profile store unavailable" }, { status: 503 });
  }
}
