import Link from "next/link";
import { db } from "@/lib/db/client";
import { Card } from "@/components/ui/Card";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

interface SkuRow {
  sku: string;
  name: string;
  n: number;
  n_vendors: number;
}

export default async function CompareIndex() {
  const o = await currentOrg();
  const result = await db.execute(sql`
    SELECT p.sku, p.name, COUNT(q.id) AS n, COUNT(DISTINCT q.vendor_id) AS n_vendors
    FROM product p
    LEFT JOIN quote q ON q.product_id = p.id
    WHERE p.org_id = ${o.id}
    GROUP BY p.sku, p.name
    ORDER BY n DESC
  `);
  const rows = result.rows as unknown as SkuRow[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page header */}
      <div>
        <div className="label-caps">COMPARE QUOTES</div>
        <h1 className="font-display text-3xl mt-1">Side-by-side normalised landed cost</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Pick a SKU. We&apos;ll show every quote you have, converted to USD/kg landed at your home port.
          Best price highlighted. Outliers flagged. Filter and sort just like in Excel.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-forest-500">No SKUs yet. Run the Polico seed to populate sample data.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.sku} href={`/compare/${r.sku}`}>
              <Card className="hover:bg-white">
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-forest-500">
                  {Number(r.n)} {Number(r.n) === 1 ? "quote" : "quotes"} captured · {Number(r.n_vendors)} {Number(r.n_vendors) === 1 ? "vendor" : "vendors"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
