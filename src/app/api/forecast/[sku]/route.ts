import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { product, priceForecast } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET(_: Request, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const o = await currentOrg();
  const [p] = await db.select().from(product).where(and(eq(product.orgId, o.id), eq(product.sku, sku)));
  if (!p) return NextResponse.json({ error: "SKU not found" }, { status: 404 });
  const [latest] = await db
    .select()
    .from(priceForecast)
    .where(and(eq(priceForecast.orgId, o.id), eq(priceForecast.productId, p.id)))
    .orderBy(desc(priceForecast.computedAt))
    .limit(1);
  if (!latest) return NextResponse.json({ kind: "INSUFFICIENT_DATA" });
  return NextResponse.json(latest);
}
