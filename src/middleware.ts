import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isProtected = createRouteMatcher([
  "/digest(.*)", "/inbox(.*)", "/compare(.*)", "/vendors(.*)", "/rfq(.*)",
  "/opportunities(.*)", "/insights(.*)", "/agents(.*)", "/alerts(.*)",
  "/notifications(.*)", "/settings(.*)", "/onboarding(.*)", "/ask(.*)",
  "/po(.*)",
  "/api/(rfq|upload|jobs|vendors|chat|agents|opportunities|alerts|forecast)(.*)",
]);

const demoBypass = (_req: NextRequest) => {
  if (process.env.DEMO_MODE === "1") return NextResponse.next();
  return null;
};

export default clerkMiddleware(async (auth, req) => {
  const bypass = demoBypass(req);
  if (bypass) return bypass;
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
