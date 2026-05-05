import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher([
  "/digest(.*)",
  "/inbox(.*)",
  "/compare(.*)",
  "/vendors(.*)",
  "/rfq(.*)",
  "/opportunities(.*)",
  "/insights(.*)",
  "/agents(.*)",
  "/alerts(.*)",
  "/notifications(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
  "/ask(.*)",
  "/api/(rfq|upload|jobs|vendors|chat|agents|opportunities|alerts|forecast)(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
