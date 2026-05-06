import { db } from "@/lib/db/client";
import { quote, vendor, product } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { ComparisonTable, type Row } from "@/components/compare/ComparisonTable";
import { currentOrg } from "@/lib/auth/current";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PriceHistoryChart } from "@/components/compare/PriceHistoryChart";

export default async function Compare({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const o = await currentOrg();

  const [p] = await db.select().from(product).where(and(eq(product.orgId, o.id), eq(product.sku, sku)));
  if (!p) {
    return <div className="text-sm text-forest-500">SKU &quot;{sku}&quot; not found.</div>;
  }

  const rawRows = await db
    .select({
      vendorId: vendor.id,
      vendorName: vendor.name,
      country: vendor.country,
      currency: quote.currency,
      unitPriceMinor: quote.unitPriceMinor,
      unit: quote.unit,
      incoterm: quote.incoterm,
      origin: quote.origin,
      leadTimeDays: quote.leadTimeDays,
      paymentTerms: quote.paymentTerms,
      validityUntil: quote.validityUntil,
      landedUsdPerKgMicros: quote.landedCostUsdPerKg,
      capturedAt: quote.capturedAt,
    })
    .from(quote)
    .innerJoin(vendor, eq(quote.vendorId, vendor.id))
    .where(and(eq(quote.orgId, o.id), eq(quote.productId, p.id)))
    .orderBy(desc(quote.capturedAt))
    .limit(40);

  // Dedup to most-recent quote per vendor
  const byVendor = new Map<string, (typeof rawRows)[number]>();
  for (const r of rawRows) {
    if (!byVendor.has(r.vendorId)) byVendor.set(r.vendorId, r);
  }
  const dedup = [...byVendor.values()];

  const avgResult = await db.execute(sql`
    SELECT AVG(landed_cost_usd_per_kg_micros)::bigint AS a
    FROM quote
    WHERE org_id = ${o.id}
      AND product_id = ${p.id}
      AND captured_at > now() - interval '30 days'
  `);
  const avg = Number((avgResult.rows[0] as { a: number | string | null } | undefined)?.a ?? 0);

  return (
    <div className="space-y-4">
      <div className="mb-3">
        <Breadcrumbs trail={[{ label: "Quote compare", href: "/compare" }, { label: p.name }]} />
      </div>
      <div>
        <div className="label-caps">Compare</div>
        <h1 className="font-display text-3xl">{p.name}</h1>
        <p className="text-sm text-forest-500">
          {dedup.length} vendors · trailing 30-day average ${(avg / 1_000_000).toFixed(2)}/kg landed
        </p>
      </div>
      <PriceHistoryChart sku={sku} />
      <ComparisonTable
        rows={dedup.map((r) => ({
          vendorId: r.vendorId,
          vendorName: r.vendorName,
          country: r.country,
          currency: r.currency,
          unitPriceMinor: Number(r.unitPriceMinor),
          unit: r.unit,
          incoterm: r.incoterm,
          origin: r.origin,
          leadTimeDays: r.leadTimeDays,
          paymentTerms: r.paymentTerms,
          validityUntil: r.validityUntil,
          landedUsdPerKgMicros: r.landedUsdPerKgMicros,
        })) as Row[]}
        avgLandedMicros={avg}
      />
    </div>
  );
}
