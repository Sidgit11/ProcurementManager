import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buyOpportunity, purchaseOrder, eventLog } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await currentOrg();
  const { id } = await params;
  const body = await req.json() as {
    poNumber: string; issueDate: string; deliveryDate: string; destPort: string; paymentTerms: string;
    notes: string;
    lines: Array<{ product: string; qty: string; unit: string; unitPrice: string; packaging: string }>;
    currency: string; vendorId: string; quoteId: string; productId: string | null;
  };
  const [opp] = await db.select().from(buyOpportunity).where(and(eq(buyOpportunity.id, id), eq(buyOpportunity.orgId, o.id)));
  if (!opp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [existing] = await db.select().from(purchaseOrder).where(and(eq(purchaseOrder.orgId, o.id), eq(purchaseOrder.quoteId, body.quoteId))).orderBy(desc(purchaseOrder.createdAt)).limit(1);

  const headerJson = {
    poNumber: body.poNumber,
    issueDate: body.issueDate,
    deliveryDate: body.deliveryDate,
    destPort: body.destPort,
    paymentTerms: body.paymentTerms,
    currency: body.currency,
    notes: body.notes,
  } as Record<string, unknown>;
  const linesJson = body.lines.map((l) => ({
    product: l.product, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, packaging: l.packaging,
  })) as Record<string, unknown>[];

  let poId = existing?.id;
  if (existing) {
    await db.update(purchaseOrder).set({ headerJson, linesJson, status: existing.status === "draft" ? "draft" : existing.status })
      .where(eq(purchaseOrder.id, existing.id));
  } else {
    const [created] = await db.insert(purchaseOrder).values({
      orgId: o.id, vendorId: body.vendorId, quoteId: body.quoteId,
      status: "draft", headerJson, linesJson,
    }).returning();
    poId = created.id;
  }

  await db.update(buyOpportunity).set({ status: opp.status === "po_sent" || opp.status === "won" ? opp.status : "po_drafted" }).where(eq(buyOpportunity.id, id));
  await db.insert(eventLog).values({ orgId: o.id, kind: "opportunity.po_drafted", payload: { opportunityId: id, poId } });

  return NextResponse.json({ id: poId });
}
