import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const o = await currentOrg();
  const days = Number(req.nextUrl.searchParams.get("days") ?? "90");
  const [p] = await db.select().from(product).where(and(eq(product.orgId, o.id), eq(product.sku, sku)));
  if (!p) return NextResponse.json({ error: "SKU not found" }, { status: 404 });
  const r = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM date_trunc('day', captured_at))::bigint AS day,
           AVG(landed_cost_usd_per_kg_micros)::bigint AS landed,
           COUNT(*)::int AS n
    FROM quote
    WHERE org_id = ${o.id}
      AND product_id = ${p.id}
      AND captured_at > now() - (${days}::int || ' days')::interval
      AND landed_cost_usd_per_kg_micros IS NOT NULL
    GROUP BY day
    ORDER BY day
  `);
  return NextResponse.json({ history: r.rows });
}
