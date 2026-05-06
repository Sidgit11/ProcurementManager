import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { VendorsHub } from "@/components/vendors/VendorsHub";

export default async function Vendors() {
  const o = await currentOrg();
  const r = await db.execute(sql`
    SELECT v.id, v.name, v.country, v.score_tier,
           COUNT(q.id)::int AS quote_count,
           COUNT(DISTINCT q.product_id)::int AS sku_count,
           MAX(q.captured_at) AS last_quote_at,
           (SELECT COUNT(*)::int FROM quality_event qe WHERE qe.vendor_id = v.id) AS issue_count
    FROM vendor v
    LEFT JOIN quote q ON q.vendor_id = v.id
    WHERE v.org_id = ${o.id}
    GROUP BY v.id
    ORDER BY v.name
  `);
  const myVendors = (r.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    country: (row.country as string | null) ?? "—",
    scoreTier: (row.score_tier as string | null) ?? "—",
    quoteCount: Number(row.quote_count ?? 0),
    skuCount: Number(row.sku_count ?? 0),
    lastQuoteAt: row.last_quote_at ? new Date(row.last_quote_at as string).toISOString() : null,
    issueCount: Number(row.issue_count ?? 0),
  }));
  return <VendorsHub myVendors={myVendors} />;
}
