import { z } from "zod";
import { tool } from "ai";
import { db } from "../db/client";
import { vendor, quote, product, rfq } from "../db/schema";
import { and, eq, sql, desc } from "drizzle-orm";

export function buildGenieTools(orgId: string) {
  return {
    searchVendors: tool({
      description: "Search vendors by name fragment. Returns vendor rows.",
      inputSchema: z.object({ query: z.string().describe("name fragment, case-insensitive") }),
      execute: async ({ query }) => {
        const rows = await db
          .select()
          .from(vendor)
          .where(and(eq(vendor.orgId, orgId), sql`${vendor.name} ILIKE ${"%" + query + "%"}`))
          .limit(20);
        return rows;
      },
    }),

    findOutliers: tool({
      description: "List recent outlier quotes (>10% above 30-day median for the SKU).",
      inputSchema: z.object({ days: z.number().default(7).describe("look-back window in days") }),
      execute: async ({ days }) => {
        const since = new Date(Date.now() - days * 86_400_000);
        const r = await db.execute(sql`
          WITH avg30 AS (
            SELECT product_id, AVG(landed_cost_usd_per_kg_micros) AS avg_landed
            FROM quote
            WHERE org_id = ${orgId} AND captured_at > now() - interval '30 days'
              AND landed_cost_usd_per_kg_micros IS NOT NULL
            GROUP BY product_id
          )
          SELECT q.id, q.captured_at, v.name AS vendor, p.name AS product,
                 q.landed_cost_usd_per_kg_micros AS landed, a.avg_landed
          FROM quote q
          JOIN vendor v ON v.id = q.vendor_id
          LEFT JOIN product p ON p.id = q.product_id
          JOIN avg30 a ON a.product_id = q.product_id
          WHERE q.org_id = ${orgId} AND q.captured_at > ${since}
            AND q.landed_cost_usd_per_kg_micros > a.avg_landed * 1.10
          ORDER BY q.captured_at DESC
          LIMIT 25
        `);
        return r.rows;
      },
    }),

    compareQuotes: tool({
      description: "Compare quotes across vendors for a specific SKU.",
      inputSchema: z.object({ sku: z.string().describe("SKU like BLACK-PEPPER-5MM") }),
      execute: async ({ sku }) => {
        const [p] = await db
          .select()
          .from(product)
          .where(and(eq(product.orgId, orgId), eq(product.sku, sku)));
        if (!p) return { error: "SKU not found", sku };
        const rows = await db
          .select({
            vendor: vendor.name,
            currency: quote.currency,
            unitPriceMinor: quote.unitPriceMinor,
            unit: quote.unit,
            incoterm: quote.incoterm,
            landed: quote.landedCostUsdPerKg,
            capturedAt: quote.capturedAt,
          })
          .from(quote)
          .innerJoin(vendor, eq(quote.vendorId, vendor.id))
          .where(and(eq(quote.orgId, orgId), eq(quote.productId, p.id)))
          .orderBy(desc(quote.capturedAt))
          .limit(40);
        return rows;
      },
    }),

    getPriceHistory: tool({
      description: "Get time-series of average landed cost per day for a SKU.",
      inputSchema: z.object({
        sku: z.string(),
        days: z.number().default(90),
      }),
      execute: async ({ sku, days }) => {
        const since = new Date(Date.now() - days * 86_400_000);
        const r = await db.execute(sql`
          SELECT date_trunc('day', q.captured_at) AS day,
                 AVG(q.landed_cost_usd_per_kg_micros)::bigint AS avg_landed,
                 COUNT(*)::int AS n
          FROM quote q
          JOIN product p ON p.id = q.product_id
          WHERE q.org_id = ${orgId} AND p.sku = ${sku} AND q.captured_at > ${since}
          GROUP BY day
          ORDER BY day
        `);
        return r.rows;
      },
    }),

    listOpenRfqs: tool({
      description: "List RFQs awaiting response.",
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await db
          .select()
          .from(rfq)
          .where(and(eq(rfq.orgId, orgId), eq(rfq.status, "sent")))
          .limit(20);
        return rows;
      },
    }),
  };
}
