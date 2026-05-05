import { db } from "../db/client";
import { alert, notification, quote, product } from "../db/schema";
import { and, eq } from "drizzle-orm";

export async function evaluateOnQuote(orgId: string, quoteId: string) {
  const [q] = await db.select().from(quote).where(eq(quote.id, quoteId));
  if (!q) return;
  const rules = await db.select().from(alert).where(and(eq(alert.orgId, orgId), eq(alert.enabled, true)));
  for (const r of rules) {
    const p = r.params as { sku?: string; thresholdLandedMicros?: number };
    if (r.kind === "price_below" && p.sku) {
      const [prod] = await db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.sku, p.sku)));
      if (q.productId !== prod?.id) continue;
      if (q.landedCostUsdPerKg && p.thresholdLandedMicros && q.landedCostUsdPerKg < p.thresholdLandedMicros) {
        await db.insert(notification).values({
          orgId,
          kind: "alert_triggered",
          payload: { alertId: r.id, quoteId: q.id, sku: p.sku, landedMicros: q.landedCostUsdPerKg },
        });
      }
    }
    if (r.kind === "price_above" && p.sku) {
      const [prod] = await db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.sku, p.sku)));
      if (q.productId !== prod?.id) continue;
      if (q.landedCostUsdPerKg && p.thresholdLandedMicros && q.landedCostUsdPerKg > p.thresholdLandedMicros) {
        await db.insert(notification).values({
          orgId,
          kind: "alert_triggered",
          payload: { alertId: r.id, quoteId: q.id, sku: p.sku, landedMicros: q.landedCostUsdPerKg },
        });
      }
    }
  }
}
