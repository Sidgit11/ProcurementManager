import { db } from "../db/client";
import { vendor, qualityEvent } from "../db/schema";
import { eq, sql, count } from "drizzle-orm";
import { computeVendorTier } from "./vendor";

export async function recomputeVendorScores(orgId: string) {
  const vendors = await db.select().from(vendor).where(eq(vendor.orgId, orgId));
  for (const v of vendors) {
    const stats = await db.execute(sql`
      WITH med AS (
        SELECT product_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY landed_cost_usd_per_kg_micros) AS m
        FROM quote
        WHERE org_id = ${orgId} AND captured_at > now() - interval '90 days' AND landed_cost_usd_per_kg_micros IS NOT NULL
        GROUP BY product_id
      ), per_quote AS (
        SELECT (q.landed_cost_usd_per_kg_micros - med.m) / NULLIF(med.m, 0)::float * 100 AS pct
        FROM quote q
        LEFT JOIN med ON med.product_id = q.product_id
        WHERE q.vendor_id = ${v.id} AND q.captured_at > now() - interval '90 days' AND q.landed_cost_usd_per_kg_micros IS NOT NULL
      )
      SELECT COUNT(*)::int AS quote_count, COALESCE(AVG(pct)::float, 0) AS pct
      FROM per_quote
    `);
    const qCount = Number((stats.rows[0] as { quote_count: number }).quote_count);
    const pct = Number((stats.rows[0] as { pct: number }).pct);
    const issuesResult = await db
      .select({ n: count() })
      .from(qualityEvent)
      .where(eq(qualityEvent.vendorId, v.id));
    const issueCount = Number(issuesResult[0]?.n ?? 0);

    const tier = computeVendorTier({
      avgResponseSeconds: 3600 * 6, // placeholder until message-pair latency is computed
      priceVsMedianPct: pct,
      qualityIssueCount: issueCount,
      quoteCount: qCount,
    });
    await db.update(vendor).set({ scoreTier: tier }).where(eq(vendor.id, v.id));
  }
}
