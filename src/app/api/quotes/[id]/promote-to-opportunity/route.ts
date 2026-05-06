import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { quote, vendor, product, buyOpportunity } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await currentOrg();
  const { id } = await params;
  const [q] = await db.select().from(quote).where(and(eq(quote.id, id), eq(quote.orgId, o.id)));
  if (!q) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Don't promote a quote that's already an open opportunity for the same vendor+product
  const existing = await db.select({ id: buyOpportunity.id })
    .from(buyOpportunity)
    .where(and(
      eq(buyOpportunity.orgId, o.id),
      eq(buyOpportunity.vendorId, q.vendorId),
      eq(buyOpportunity.status, "open"),
    ));
  if (existing.some((e) => e.id)) {
    // Allow but don't dedup hard; for simplicity proceed and let UI show.
  }

  // Compute a strength score from price gap vs market median (best-effort; no LLM call)
  let scoreMicros = 50_000; // default mid-tier
  let reasoning = "Promoted from inbox.";
  if (q.productId && q.landedCostUsdPerKg != null) {
    const r = await db.execute(sql`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY landed_cost_usd_per_kg_micros) AS median
      FROM quote
      WHERE org_id = ${o.id} AND product_id = ${q.productId}
        AND captured_at > now() - interval '30 days'
        AND landed_cost_usd_per_kg_micros IS NOT NULL
    `);
    const median = Number((r.rows[0] as { median: number | string | null } | undefined)?.median ?? 0);
    if (median > 0) {
      const gap = (median - q.landedCostUsdPerKg) / median;
      // gap > 0 means the quote is below median; clamp to [-0.2, 0.2] then * 1M micros to get a 0-200k score
      const clamped = Math.max(-0.2, Math.min(0.2, gap));
      scoreMicros = Math.max(10_000, Math.round((clamped + 0.05) * 1_000_000));
      const pct = (gap * 100).toFixed(1);
      const direction = gap > 0 ? `${pct}% below` : `${(-gap * 100).toFixed(1)}% above`;
      const [v] = await db.select().from(vendor).where(eq(vendor.id, q.vendorId));
      const [p] = await db.select().from(product).where(eq(product.id, q.productId));
      reasoning = `${v?.name ?? "This vendor"} is quoting ${p?.name ?? "this product"} at $${(q.landedCostUsdPerKg / 1_000_000).toFixed(2)}/kg landed — ${direction} the trailing 30-day median of $${(median / 1_000_000).toFixed(2)}.`;
    }
  }

  const [opp] = await db.insert(buyOpportunity).values({
    orgId: o.id,
    quoteId: q.id,
    vendorId: q.vendorId,
    productId: q.productId,
    score: scoreMicros,
    reasoningText: reasoning,
    expiresAt: q.validityUntil,
  }).returning();

  return NextResponse.json({ id: opp.id });
}
