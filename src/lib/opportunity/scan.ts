import { db } from "../db/client";
import { buyOpportunity } from "../db/schema";
import { sql } from "drizzle-orm";
import { scoreOpportunity } from "./score";
import { draftReasoning } from "./reason";
import type { Tier } from "../scoring/vendor";

export async function scanForOpportunities(orgId: string, threshold = 0.04) {
  const r = await db.execute(sql`
    WITH med AS (
      SELECT q.product_id,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY q.landed_cost_usd_per_kg_micros) AS m
      FROM quote q
      WHERE q.org_id = ${orgId}
        AND q.captured_at > now() - interval '30 days'
        AND q.landed_cost_usd_per_kg_micros IS NOT NULL
      GROUP BY q.product_id
    )
    SELECT q.id AS quote_id,
           q.vendor_id,
           q.product_id,
           p.name AS product_name,
           v.name AS vendor_name,
           v.score_tier,
           q.unit_price_minor,
           q.currency,
           q.unit,
           q.landed_cost_usd_per_kg_micros AS landed,
           m.m AS median,
           q.validity_until
    FROM quote q
    JOIN vendor v ON v.id = q.vendor_id
    LEFT JOIN product p ON p.id = q.product_id
    JOIN med m ON m.product_id = q.product_id
    WHERE q.org_id = ${orgId}
      AND q.captured_at > now() - interval '7 days'
      AND q.landed_cost_usd_per_kg_micros IS NOT NULL
      AND q.landed_cost_usd_per_kg_micros < m.m
    ORDER BY q.captured_at DESC
    LIMIT 50
  `);

  let created = 0;
  for (const row of r.rows as Record<string, unknown>[]) {
    const median = Number(row.median);
    const landed = Number(row.landed);
    const gap = (median - landed) / median;
    const validityRaw = row.validity_until as string | Date | null;
    const validityDate = validityRaw ? new Date(validityRaw) : null;
    const hoursToValidity = validityDate
      ? Math.max(0, (validityDate.getTime() - Date.now()) / 3_600_000)
      : 168;
    const tier = ((row.score_tier as string) ?? "RELIABLE") as Tier;
    const score = scoreOpportunity({ basePriceGapPct: gap, vendorTier: tier, hoursToValidity });
    if (score < threshold) continue;

    const reasoning = await draftReasoning({
      product: row.product_name as string,
      vendorName: row.vendor_name as string,
      vendorTier: tier,
      unitPrice: `${row.currency} ${(Number(row.unit_price_minor) / 100).toFixed(2)}/${row.unit}`,
      landedUsdPerKg: landed / 1_000_000,
      trailingMedianUsdPerKg: median / 1_000_000,
      basePriceGapPct: gap,
      hoursToValidity,
    });

    await db.insert(buyOpportunity).values({
      orgId,
      quoteId: row.quote_id as string,
      vendorId: row.vendor_id as string,
      productId: row.product_id as string | undefined,
      score: Math.round(score * 1_000_000),
      reasoningText: reasoning,
      expiresAt: validityDate,
    });
    created++;
  }
  return { created };
}
