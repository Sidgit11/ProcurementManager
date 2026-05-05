import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { agentPolicy, org } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runDailySummary } from "@/lib/agents/daily-summary";
import { runFollowUp } from "@/lib/agents/follow-up";
import { runBuyNow } from "@/lib/agents/buy-now";

export async function GET() {
  const orgs = await db.select().from(org);
  let dispatched = 0;
  for (const o of orgs) {
    const policies = await db.select().from(agentPolicy).where(eq(agentPolicy.orgId, o.id));
    const enabled = new Set(policies.filter((p) => p.enabled).map((p) => p.agentName));
    if (enabled.has("daily_summary")) { await runDailySummary(o.id); dispatched++; }
    if (enabled.has("follow_up"))     { await runFollowUp(o.id);     dispatched++; }
    if (enabled.has("buy_now"))       { await runBuyNow(o.id);       dispatched++; }
  }
  return NextResponse.json({ ok: true, dispatched });
}

export const runtime = "nodejs";
