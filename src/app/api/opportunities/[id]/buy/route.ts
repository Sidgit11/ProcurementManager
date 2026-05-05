import { NextRequest, NextResponse } from "next/server";
import { db, getDb } from "@/lib/db/client";
import { buyOpportunity, purchaseOrder, quote } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await getDb();
  const { id } = await params;
  const [opp] = await db.select().from(buyOpportunity).where(eq(buyOpportunity.id, id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [q] = await db.select().from(quote).where(eq(quote.id, opp.quoteId));

  const [po] = await db.insert(purchaseOrder).values({
    orgId: opp.orgId,
    vendorId: opp.vendorId,
    quoteId: opp.quoteId,
    headerJson: { issuedAt: new Date().toISOString() } as Record<string, unknown>,
    linesJson: q
      ? [{
          product: q.productNameRaw,
          unit: q.unit,
          unitPriceMinor: Number(q.unitPriceMinor),
          currency: q.currency,
          incoterm: q.incoterm,
        }] as Record<string, unknown>[]
      : [],
    status: "draft",
  }).returning();

  await db.update(buyOpportunity).set({ status: "acted" }).where(eq(buyOpportunity.id, id));

  const url = new URL(`/po/${po.id}`, req.url);
  return NextResponse.redirect(url, { status: 303 });
}
