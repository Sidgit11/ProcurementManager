import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { VendorsTable } from "@/components/vendors/VendorsTable";

export default async function Vendors() {
  const o = await currentOrg();
  const r = await db.execute(sql`
    SELECT v.id,
           v.name,
           v.country,
           v.score_tier,
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
  const rows = (r.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    country: (row.country as string | null) ?? "—",
    scoreTier: (row.score_tier as string | null) ?? "—",
    quoteCount: Number(row.quote_count ?? 0),
    skuCount: Number(row.sku_count ?? 0),
    lastQuoteAt: row.last_quote_at ? new Date(row.last_quote_at as string).toISOString() : null,
    issueCount: Number(row.issue_count ?? 0),
  }));
  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Vendors</div>
        <h1 className="font-display text-3xl">Everyone you&apos;ve ever been quoted by, automatically</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Profiles build themselves from your captured conversations. Score tiers update with every new quote: RELIABLE if fast and competitive, AGGRESSIVE if very cheap but inconsistent, SLOW if response time drags, OUTLIER if consistently overpriced.
        </p>
      </div>
      <VendorsTable rows={rows} />
    </div>
  );
}
