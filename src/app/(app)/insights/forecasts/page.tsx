import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { currentOrg } from "@/lib/auth/current";

interface Row {
  sku: string;
  name: string;
  kind: string | null;
  directional_bias: string | null;
  center_micros: number | null;
  confidence_milli: number | null;
}

export default async function Forecasts() {
  const o = await currentOrg();
  const r = await db.execute(sql`
    SELECT DISTINCT ON (p.id) p.sku, p.name,
           f.kind, f.directional_bias, f.center_micros, f.confidence_milli
    FROM product p
    LEFT JOIN price_forecast f ON f.product_id = p.id
    WHERE p.org_id = ${o.id}
    ORDER BY p.id, f.computed_at DESC NULLS LAST
  `);

  const rows = r.rows as unknown as Row[];

  return (
    <div>
      <h1 className="font-display text-3xl mb-3">Forecasts (next 14 days)</h1>
      <p className="text-sm text-forest-500 mb-4">
        Rolling-median model based on the last 90 days of captured quotes. Forecasts require ≥30 daily observations per SKU.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((x) => {
          if (!x.kind || x.kind === "INSUFFICIENT_DATA") {
            return (
              <Card key={x.sku}>
                <div className="font-medium">{x.name}</div>
                <div className="label-caps mt-1">INSUFFICIENT DATA</div>
              </Card>
            );
          }
          const conf = x.confidence_milli != null ? (x.confidence_milli / 10).toFixed(0) : "—";
          return (
            <Card key={x.sku}>
              <div className="font-medium">{x.name}</div>
              <div className="mt-1 text-2xl font-display">
                {x.center_micros != null ? `$${(Number(x.center_micros) / 1_000_000).toFixed(2)}/kg` : "—"}
              </div>
              <div className="label-caps mt-1">Trend: {x.directional_bias?.toUpperCase() ?? "FLAT"}</div>
              <div className="text-xs text-forest-500">Confidence {conf}%</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
