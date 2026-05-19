import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/lesson-pack(.*)",
  "/ai-planner(.*)",
  "/critical-planner(.*)",
  "/account(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/library(.*)",
  "/notes(.*)",
  "/coverage(.*)",
  "/school(.*)",
  "/wellbeing-report(.*)",
  "/profile-setup(.*)",
  "/survey-responses(.*)",
]);

const needsProfileRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/lesson-pack(.*)",
  "/ai-planner(.*)",
  "/critical-planner(.*)",
  "/account(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/library(.*)",
  "/notes(.*)",
  "/coverage(.*)",
  "/school(.*)",
  "/wellbeing-report(.*)",
  "/marking(.*)",
  "/retrieval(.*)",
  "/compliance(.*)",
  "/survey-responses(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();
  if (userId && needsProfileRoute(req)) {
    const profileComplete = req.cookies.get("pa_profile_complete")?.value;
    if (profileComplete !== "1") {
      return NextResponse.redirect(new URL("/profile-setup", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
