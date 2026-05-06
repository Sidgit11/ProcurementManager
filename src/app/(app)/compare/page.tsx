import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { CompareTable } from "@/components/compare/CompareTable";

export default async function CompareIndex() {
  const o = await currentOrg();
  const r = await db.execute(sql`
    SELECT p.sku,
           p.name,
           p.category,
           COUNT(q.id)::int AS quote_count,
           COUNT(DISTINCT q.vendor_id)::int AS vendor_count,
           AVG(q.landed_cost_usd_per_kg_micros)::bigint AS avg_landed_micros,
           MIN(q.landed_cost_usd_per_kg_micros)::bigint AS best_landed_micros
    FROM product p
    LEFT JOIN quote q ON q.product_id = p.id
    WHERE p.org_id = ${o.id}
    GROUP BY p.sku, p.name, p.category
    ORDER BY quote_count DESC
  `);
  const rows = (r.rows as Record<string, unknown>[]).map((row) => ({
    id: row.sku as string,
    sku: row.sku as string,
    name: row.name as string,
    category: row.category as string,
    quoteCount: Number(row.quote_count ?? 0),
    vendorCount: Number(row.vendor_count ?? 0),
    avgLandedMicros: row.avg_landed_micros != null ? Number(row.avg_landed_micros) : null,
    bestLandedMicros: row.best_landed_micros != null ? Number(row.best_landed_micros) : null,
  }));
  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Compare quotes</div>
        <h1 className="font-display text-3xl">Side-by-side normalized landed cost</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Pick a SKU. We&apos;ll show every quote you have, converted to USD/kg landed at your home port. Best price highlighted. Outliers flagged. Filter and sort just like in Excel.
        </p>
      </div>
      <CompareTable rows={rows} />
    </div>
  );
}
