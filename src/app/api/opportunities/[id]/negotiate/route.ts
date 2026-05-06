import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buyOpportunity, negotiation, eventLog } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await currentOrg();
  const { id } = await params;
  const body = await req.json() as { message: string; channel: "email" | "whatsapp"; targetUsdPerKg: number };

  const [opp] = await db.select().from(buyOpportunity).where(and(eq(buyOpportunity.id, id), eq(buyOpportunity.orgId, o.id)));
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.insert(negotiation).values({
    orgId: o.id,
    vendorId: opp.vendorId,
    targetPriceMinor: Math.round(body.targetUsdPerKg * 100),
    floorPriceMinor: Math.round(body.targetUsdPerKg * 0.95 * 100),
    agentDraftedResponse: body.message,
    state: "open",
  });

  await db.update(buyOpportunity).set({ status: "negotiating" }).where(eq(buyOpportunity.id, id));
  await db.insert(eventLog).values({
    orgId: o.id, kind: "opportunity.negotiation_sent",
    payload: { opportunityId: id, channel: body.channel, targetUsdPerKg: body.targetUsdPerKg },
  });

  return NextResponse.json({ ok: true });
}
