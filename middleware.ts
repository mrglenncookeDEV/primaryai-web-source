import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
