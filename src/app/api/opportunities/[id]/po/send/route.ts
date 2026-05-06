import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buyOpportunity, purchaseOrder, eventLog } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await currentOrg();
  const { id } = await params;
  const body = await req.json() as { channel: "email" | "whatsapp"; message: string; poId: string };
  const [opp] = await db.select().from(buyOpportunity).where(and(eq(buyOpportunity.id, id), eq(buyOpportunity.orgId, o.id)));
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!body.poId) return NextResponse.json({ error: "Save the draft first" }, { status: 400 });

  const [po] = await db.select().from(purchaseOrder).where(eq(purchaseOrder.id, body.poId));
  if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });
  const updatedHeader = { ...(po.headerJson as Record<string, unknown>), sentChannel: body.channel, sendMessage: body.message, sentAt: new Date().toISOString() };
  await db.update(purchaseOrder).set({ status: "issued", headerJson: updatedHeader }).where(eq(purchaseOrder.id, body.poId));
  await db.update(buyOpportunity).set({ status: "po_sent" }).where(eq(buyOpportunity.id, id));
  await db.insert(eventLog).values({ orgId: o.id, kind: "opportunity.po_sent", payload: { opportunityId: id, poId: body.poId, channel: body.channel } });
  return NextResponse.json({ ok: true });
}
