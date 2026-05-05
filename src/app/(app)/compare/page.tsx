import Link from "next/link";
import { db } from "@/lib/db/client";
import { Card } from "@/components/ui/Card";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

interface SkuRow {
  sku: string;
  name: string;
  n: number;
}

export default async function CompareIndex() {
  const o = await currentOrg();
  const result = await db.execute(sql`
    SELECT p.sku, p.name, COUNT(q.id) AS n
    FROM product p
    LEFT JOIN quote q ON q.product_id = p.id
    WHERE p.org_id = ${o.id}
    GROUP BY p.sku, p.name
    ORDER BY n DESC
  `);
  const rows = result.rows as unknown as SkuRow[];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Compare quotes</h1>
      {rows.length === 0 && (
        <p className="text-sm text-forest-500">No SKUs yet. Run the Polico seed to populate sample data.</p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((r) => (
          <Link key={r.sku} href={`/compare/${r.sku}`}>
            <Card className="hover:bg-white">
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-forest-500">{Number(r.n)} quotes</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
