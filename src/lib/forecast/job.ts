import { db } from "../db/client";
import { product, priceForecast } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { forecastFromHistory } from "./model";

export async function computeForecasts(orgId: string) {
  const products = await db.select().from(product).where(eq(product.orgId, orgId));
  for (const p of products) {
    const r = await db.execute(sql`
      SELECT EXTRACT(EPOCH FROM date_trunc('day', captured_at))::bigint AS day,
             AVG(landed_cost_usd_per_kg_micros)::bigint AS landed
      FROM quote
      WHERE org_id = ${orgId} AND product_id = ${p.id}
        AND captured_at > now() - interval '90 days'
        AND landed_cost_usd_per_kg_micros IS NOT NULL
      GROUP BY day
      ORDER BY day
    `);
    const days = r.rows.map((row) => ({
      day: Number((row as { day: number }).day),
      landed: Number((row as { landed: number }).landed),
    }));
    const out = forecastFromHistory(days);
    if (out.kind === "INSUFFICIENT_DATA") {
      await db.insert(priceForecast).values({
        orgId,
        productId: p.id,
        kind: "INSUFFICIENT_DATA",
        modelVersion: "v1",
      });
    } else {
      await db.insert(priceForecast).values({
        orgId,
        productId: p.id,
        kind: "FORECAST",
        centerMicros: out.centerMicros,
        bandPctMicros: out.bandPctMicros,
        directionalBias: out.directionalBias,
        confidence: Math.round(out.confidence * 1000),
        modelVersion: "v1",
      });
    }
  }
}
