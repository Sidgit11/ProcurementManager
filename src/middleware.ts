import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATTERNS = [
  "/digest", "/inbox", "/compare", "/vendors", "/rfq",
  "/opportunities", "/insights", "/agents", "/alerts",
  "/notifications", "/settings", "/onboarding", "/ask", "/po",
  "/api/rfq", "/api/upload", "/api/jobs", "/api/vendors",
  "/api/chat", "/api/agents", "/api/opportunities", "/api/alerts", "/api/forecast",
];

function buildHandler(): (req: NextRequest) => Promise<Response> | Response {
  if (process.env.DEMO_MODE === "1") {
    // No Clerk dependency at all — every request goes through.
    return (_req: NextRequest) => NextResponse.next();
  }
  // Lazy require so Clerk is never loaded in demo mode (it requires a publishable key at import).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server") as typeof import("@clerk/nextjs/server");
  const isProtected = createRouteMatcher(PROTECTED_PATTERNS.map((p) => `${p}(.*)`));
  return clerkMiddleware(async (auth, req) => {
    if (isProtected(req)) await auth.protect();
  }) as unknown as (req: NextRequest) => Promise<Response> | Response;
}

const handler = buildHandler();
export default handler;

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
