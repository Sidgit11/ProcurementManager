import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendor, product, rfq } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET(req: NextRequest) {
  const o = await currentOrg();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ vendors: [], products: [], rfqs: [] });

  const like = `%${q}%`;

  const vendors = await db.select({ id: vendor.id, name: vendor.name, country: vendor.country, scoreTier: vendor.scoreTier })
    .from(vendor)
    .where(and(eq(vendor.orgId, o.id), sql`${vendor.name} ILIKE ${like}`))
    .limit(8);

  const products = await db.select({ id: product.id, sku: product.sku, name: product.name, category: product.category })
    .from(product)
    .where(and(eq(product.orgId, o.id), sql`(${product.name} ILIKE ${like} OR ${product.sku} ILIKE ${like})`))
    .limit(8);

  const rfqs = await db.select({ id: rfq.id, productNameRaw: rfq.productNameRaw, status: rfq.status })
    .from(rfq)
    .where(and(eq(rfq.orgId, o.id), sql`${rfq.productNameRaw} ILIKE ${like}`))
    .limit(6);

  return NextResponse.json({ vendors, products, rfqs });
}
