import { db } from "@/lib/db/client";
import { buyOpportunity, vendor, product, quote, vendorContact, purchaseOrder, negotiation, eventLog, org } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { OpportunityHub } from "@/components/opportunity/OpportunityHub";

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", VN: "Vietnam", ID: "Indonesia", TR: "Türkiye", BR: "Brazil",
};

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await currentOrg();

  const [row] = await db.select().from(buyOpportunity).where(and(eq(buyOpportunity.id, id), eq(buyOpportunity.orgId, o.id)));
  if (!row) {
    return (
      <div className="space-y-3">
        <Breadcrumbs trail={[{ label: "Buy opportunities", href: "/opportunities" }, { label: "Not found" }]} />
        <p className="text-sm text-forest-500">Opportunity not found.</p>
      </div>
    );
  }

  const [v] = await db.select().from(vendor).where(eq(vendor.id, row.vendorId));
  const [p] = row.productId ? await db.select().from(product).where(eq(product.id, row.productId)) : [];
  const [q] = await db.select().from(quote).where(eq(quote.id, row.quoteId));
  const contacts = await db.select().from(vendorContact).where(eq(vendorContact.vendorId, row.vendorId)).orderBy(desc(vendorContact.isPrimary));

  // Find any existing PO and negotiation for this opportunity
  const [existingPo] = await db.select().from(purchaseOrder).where(and(eq(purchaseOrder.orgId, o.id), eq(purchaseOrder.quoteId, row.quoteId))).orderBy(desc(purchaseOrder.createdAt)).limit(1);
  const [existingNegotiation] = await db.select().from(negotiation).where(and(eq(negotiation.orgId, o.id), eq(negotiation.vendorId, row.vendorId))).orderBy(desc(negotiation.updatedAt)).limit(1);

  // Negotiation insights — computed from data (no LLM call required)
  const insights = await computeNegotiationInsights(o.id, row.vendorId, row.productId, q);

  // Org defaults for PO prefill
  const [orgRow] = await db.select().from(org).where(eq(org.id, o.id));

  // Recent activity for this opportunity
  const events = await db.select().from(eventLog)
    .where(and(eq(eventLog.orgId, o.id), sql`${eventLog.kind} LIKE 'opportunity.%' AND ${eventLog.payload}->>'opportunityId' = ${id}`))
    .orderBy(desc(eventLog.createdAt))
    .limit(20);
  const eventsForClient = events.map((e) => ({
    id: e.id,
    kind: e.kind,
    payload: e.payload as Record<string, unknown>,
    createdAt: new Date(e.createdAt as unknown as string).toISOString(),
  }));

  return (
    <div className="space-y-4 max-w-5xl">
      <Breadcrumbs trail={[
        { label: "Buy opportunities", href: "/opportunities" },
        { label: p?.name ?? "Opportunity" },
      ]} />
      <OpportunityHub
        opportunity={{
          id: row.id,
          status: row.status,
          score: row.score,
          reasoning: row.reasoningText,
          counterfactual: row.counterfactualText,
          expiresAt: row.expiresAt ? new Date(row.expiresAt as unknown as string).toISOString() : null,
        }}
        vendor={{
          id: v?.id ?? "",
          name: v?.name ?? "Unknown vendor",
          country: COUNTRY_NAMES[v?.country ?? ""] ?? v?.country ?? "—",
          scoreTier: v?.scoreTier ?? null,
          primaryContact: contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null,
          allContacts: contacts,
        }}
        product={p ? { id: p.id, sku: p.sku, name: p.name, defaultUnit: p.defaultUnit } : null}
        quote={{
          id: q.id,
          unitPriceMinor: Number(q.unitPriceMinor),
          currency: q.currency,
          unit: q.unit,
          incoterm: q.incoterm,
          origin: q.origin,
          packaging: q.packaging,
          leadTimeDays: q.leadTimeDays,
          paymentTerms: q.paymentTerms,
          validityUntil: q.validityUntil ? new Date(q.validityUntil as unknown as string).toISOString() : null,
          landedCostUsdPerKg: q.landedCostUsdPerKg,
        }}
        insights={insights}
        existingPoId={existingPo?.id ?? null}
        existingNegotiationDraft={existingNegotiation?.agentDraftedResponse ?? null}
        orgDefaults={{
          homePort: orgRow?.homePort ?? "BR-NVT",
          homeCurrency: orgRow?.homeCurrency ?? "USD",
          orgName: orgRow?.name ?? "—",
        }}
        events={eventsForClient}
      />
    </div>
  );
}

async function computeNegotiationInsights(
  orgId: string,
  vendorId: string,
  productId: string | null,
  q: typeof quote.$inferSelect,
): Promise<{
  vendorAvgMicros: number | null;
  vendorLowMicros: number | null;
  marketMedianMicros: number | null;
  competitorsBelowCount: number;
  suggestedTargetMicros: number;
  rationaleBullets: string[];
}> {
  let vendorAvgMicros: number | null = null;
  let vendorLowMicros: number | null = null;
  let marketMedianMicros: number | null = null;
  let competitorsBelowCount = 0;

  if (productId) {
    const r = await db.execute(sql`
      WITH vendor_q AS (
        SELECT landed_cost_usd_per_kg_micros AS landed
        FROM quote
        WHERE org_id = ${orgId} AND vendor_id = ${vendorId} AND product_id = ${productId}
          AND landed_cost_usd_per_kg_micros IS NOT NULL
          AND captured_at > now() - interval '90 days'
      ),
      market AS (
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY landed_cost_usd_per_kg_micros) AS median
        FROM quote
        WHERE org_id = ${orgId} AND product_id = ${productId}
          AND landed_cost_usd_per_kg_micros IS NOT NULL
          AND captured_at > now() - interval '90 days'
      ),
      below AS (
        SELECT COUNT(DISTINCT vendor_id)::int AS n
        FROM quote
        WHERE org_id = ${orgId} AND product_id = ${productId}
          AND vendor_id <> ${vendorId}
          AND landed_cost_usd_per_kg_micros IS NOT NULL
          AND landed_cost_usd_per_kg_micros < ${q.landedCostUsdPerKg ?? 999_999_999}
          AND captured_at > now() - interval '90 days'
      )
      SELECT
        (SELECT AVG(landed)::bigint FROM vendor_q) AS vendor_avg,
        (SELECT MIN(landed)::bigint FROM vendor_q) AS vendor_low,
        (SELECT median FROM market) AS market_median,
        (SELECT n FROM below) AS below_n
    `);
    const stats = r.rows[0] as { vendor_avg: number | null; vendor_low: number | null; market_median: number | null; below_n: number };
    vendorAvgMicros = stats.vendor_avg != null ? Number(stats.vendor_avg) : null;
    vendorLowMicros = stats.vendor_low != null ? Number(stats.vendor_low) : null;
    marketMedianMicros = stats.market_median != null ? Number(stats.market_median) : null;
    competitorsBelowCount = Number(stats.below_n ?? 0);
  }

  // Suggested target: 3% below current quote OR market median, whichever is more aggressive (lower)
  // but never below vendor's historical low
  const currentLanded = q.landedCostUsdPerKg ?? Number(q.unitPriceMinor) * 10_000;
  let target = Math.round(currentLanded * 0.97);
  if (marketMedianMicros && marketMedianMicros < target) target = Math.round((marketMedianMicros + currentLanded) / 2);
  if (vendorLowMicros && target < vendorLowMicros) target = vendorLowMicros;

  // Build rationale bullets
  const rationaleBullets: string[] = [];
  if (vendorAvgMicros && vendorAvgMicros < currentLanded) {
    const pct = ((currentLanded - vendorAvgMicros) / vendorAvgMicros * 100).toFixed(1);
    rationaleBullets.push(`Their own 90-day average is $${(vendorAvgMicros / 1_000_000).toFixed(2)}/kg — ${pct}% lower than today's quote.`);
  }
  if (vendorLowMicros && vendorLowMicros < currentLanded) {
    rationaleBullets.push(`They have quoted as low as $${(vendorLowMicros / 1_000_000).toFixed(2)}/kg in the last 90 days.`);
  }
  if (marketMedianMicros && marketMedianMicros < currentLanded) {
    const pct = ((currentLanded - marketMedianMicros) / marketMedianMicros * 100).toFixed(1);
    rationaleBullets.push(`Market median across all your vendors is $${(marketMedianMicros / 1_000_000).toFixed(2)}/kg — current quote is ${pct}% above that.`);
  }
  if (competitorsBelowCount > 0) {
    rationaleBullets.push(`${competitorsBelowCount} other vendor${competitorsBelowCount === 1 ? "" : "s"} in your pool ${competitorsBelowCount === 1 ? "is" : "are"} currently quoting below this price.`);
  }
  if (rationaleBullets.length === 0) {
    rationaleBullets.push("This vendor's quote is already competitive against the data we have. Soft asks (validity extension, payment-term flex) are likely to land better than a hard price ask.");
  }

  return {
    vendorAvgMicros,
    vendorLowMicros,
    marketMedianMicros,
    competitorsBelowCount,
    suggestedTargetMicros: target,
    rationaleBullets,
  };
}
