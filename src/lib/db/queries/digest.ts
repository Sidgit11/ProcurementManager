import { db } from "../client";
import { quote, vendor, product } from "../schema";
import { and, desc, eq, gt, sql } from "drizzle-orm";

export async function getDigestSummary(orgId: string, sinceDays = 7) {
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);

  const newQuotes = await db.select({
    id: quote.id,
    capturedAt: quote.capturedAt,
    vendorName: vendor.name,
    productName: product.name,
    productNameRaw: quote.productNameRaw,
    unitPriceMinor: quote.unitPriceMinor,
    currency: quote.currency,
    unit: quote.unit,
    landed: quote.landedCostUsdPerKg,
  })
    .from(quote)
    .leftJoin(vendor, eq(quote.vendorId, vendor.id))
    .leftJoin(product, eq(quote.productId, product.id))
    .where(and(eq(quote.orgId, orgId), gt(quote.capturedAt, since)))
    .orderBy(desc(quote.capturedAt))
    .limit(40);

  const outliers = await db.execute(sql`
    WITH avg30 AS (
      SELECT product_id, AVG(landed_cost_usd_per_kg_micros) AS avg_landed
      FROM quote
      WHERE org_id = ${orgId} AND captured_at > now() - interval '30 days' AND landed_cost_usd_per_kg_micros IS NOT NULL
      GROUP BY product_id
    )
    SELECT q.id, q.captured_at, v.name AS vendor_name, p.name AS product_name,
           q.landed_cost_usd_per_kg_micros AS landed, a.avg_landed AS avg_landed
    FROM quote q
    JOIN vendor v ON v.id = q.vendor_id
    LEFT JOIN product p ON p.id = q.product_id
    JOIN avg30 a ON a.product_id = q.product_id
    WHERE q.org_id = ${orgId}
      AND q.captured_at > ${since}
      AND q.landed_cost_usd_per_kg_micros > a.avg_landed * 1.10
    ORDER BY q.captured_at DESC
    LIMIT 10
  `);

  return { newQuotes, outliers: outliers.rows };
}
