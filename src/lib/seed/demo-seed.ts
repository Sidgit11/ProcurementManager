import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { POLICO_CATALOG, BASE_PRICES_USD_PER_KG } from "./catalog";
import { buildVendors } from "./vendors";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";
import { DEFAULT_POLICIES } from "../agents/policy";
import { DEMO_ORG, DEMO_USER } from "../demo/is-demo";

type DB = PgliteDatabase<typeof schema>;

export async function seedDemo(db: DB) {
  // Create org + user with stable UUIDs
  await db.insert(schema.org).values({
    id: DEMO_ORG.id,
    clerkOrgId: DEMO_ORG.clerkOrgId,
    name: DEMO_ORG.name,
    homeCurrency: DEMO_ORG.homeCurrency,
    homePort: DEMO_ORG.homePort,
  });

  await db.insert(schema.user).values({
    id: DEMO_USER.id,
    orgId: DEMO_ORG.id,
    clerkUserId: DEMO_USER.clerkUserId,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    role: DEMO_USER.role,
  });

  // FX rates
  const fx = [
    { quote: "BRL", ratePerUsd: 5.10 },
    { quote: "INR", ratePerUsd: 82.50 },
    { quote: "EUR", ratePerUsd: 0.92 },
    // VND (25000/USD) and IDR (15700/USD) * 1_000_000 overflow int32 (max ~2.1B).
    // Store as scaled-down values (rate / 1000 * 1000) with a note.
    // The fxPerUsd map used in seed is inline (not from DB), so DB value is reference-only.
    { quote: "VND", ratePerUsd: 25.0 },  // stored as 25 (not 25000) to avoid int32 overflow
    { quote: "IDR", ratePerUsd: 15.7 },  // stored as 15.7 to avoid int32 overflow
    { quote: "TRY", ratePerUsd: 32.40 },
    { quote: "USD", ratePerUsd: 1.0 },
  ];
  for (const r of fx) {
    await db.insert(schema.fxRateSnapshot).values({
      base: "USD",
      quote: r.quote,
      // Cap at int32 max (2_147_483_647) to avoid PGlite overflow errors.
      rate: Math.min(Math.round(r.ratePerUsd * 1_000_000), 2_147_483_647),
    });
  }

  // Corridors
  const corridors = [
    { origin: "IN", freightUsdPerKg: 0.18 },
    { origin: "VN", freightUsdPerKg: 0.22 },
    { origin: "ID", freightUsdPerKg: 0.21 },
    { origin: "TR", freightUsdPerKg: 0.16 },
    { origin: "BR", freightUsdPerKg: 0.04 },
  ];
  for (const c of corridors) {
    await db.insert(schema.corridorAssumption).values({
      orgId: DEMO_ORG.id,
      origin: c.origin,
      destinationPort: "BR-SSZ",
      freightUsdPerKg: Math.round(c.freightUsdPerKg * 1_000_000),
      insuranceBps: 50,
      dutyBps: 800,
    });
  }

  // Products
  const products = await db
    .insert(schema.product)
    .values(POLICO_CATALOG.map((p) => ({ ...p, orgId: DEMO_ORG.id })))
    .returning();

  // Vendors
  const vendors = await db.insert(schema.vendor).values(buildVendors(DEMO_ORG.id)).returning();

  const fxPerUsd = new Map([
    ["USD", 1.0], ["BRL", 5.10], ["INR", 82.50], ["EUR", 0.92],
    ["VND", 25_000], ["IDR", 15_700], ["TRY", 32.40],
  ]);
  const FREIGHT_MICROS: Record<string, number> = {
    IN: 180_000, VN: 220_000, ID: 210_000, TR: 160_000, BR: 40_000,
  };
  const incoterms = ["CIF", "FOB", "DAP"] as const;

  // Threads (one per vendor)
  const threadInserts = vendors.map((v) => ({
    orgId: DEMO_ORG.id,
    vendorId: v.id,
    channel: "whatsapp_export" as const,
    subject: `Chat with ${v.name}`,
    lastMessageAt: new Date(),
  }));
  const insertedThreads = await db.insert(schema.thread).values(threadInserts).returning();
  const threadByVendor = new Map(insertedThreads.map((t) => [t.vendorId, t.id]));

  // Use 50 vendors for demo (faster init)
  const VENDOR_SUBSET = vendors.slice(0, 50);

  const messageInserts: Array<typeof schema.message.$inferInsert> = [];
  type QuoteToInsert = typeof schema.quote.$inferInsert & { _msgIndex: number };
  const quoteInserts: QuoteToInsert[] = [];

  // Deterministic-ish randomness so demo data is consistent
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  for (const v of VENDOR_SUBSET) {
    const tId = threadByVendor.get(v.id)!;
    const skuCount = 3 + Math.floor(rand() * 3);
    const skus = [...products].sort(() => rand() - 0.5).slice(0, skuCount);

    for (const p of skus) {
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const daysAgo = Math.floor(rand() * 180);
        const sentAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

        const base = BASE_PRICES_USD_PER_KG[p.sku];
        const variance = 0.85 + rand() * 0.30;
        const isOutlier = rand() < 0.08;
        const factor = isOutlier ? (rand() < 0.5 ? 1.18 : 0.82) : variance;
        const usdPerKg = base * factor;

        const unit = p.defaultUnit;
        const unitPriceUsd = unit === "MT" ? usdPerKg * 1000 : usdPerKg;
        const incoterm: Incoterm = incoterms[Math.floor(rand() * incoterms.length)];

        const msgIdx = messageInserts.length;
        messageInserts.push({
          orgId: DEMO_ORG.id,
          threadId: tId,
          channel: "whatsapp_export",
          direction: "inbound",
          senderName: v.name,
          body: `${p.name} available — $${unitPriceUsd.toFixed(2)}/${unit} ${incoterm} Santos. MOQ 1${unit === "MT" ? "MT" : "kg"}. Validity 7 days.`,
          sentAt,
          classification: "quote",
        });

        const corridor = {
          freightUsdPerKgMicros: FREIGHT_MICROS[v.country ?? "IN"] ?? 180_000,
          insuranceBps: 50,
          dutyBps: 800,
        };
        let landed: number | null = null;
        try {
          landed = computeLandedCostUsdPerKgMicros({
            unitPriceMinor: Math.round(unitPriceUsd * 100),
            currency: "USD",
            unit,
            incoterm,
            origin: v.country ?? "IN",
            destinationPort: "BR-SSZ",
            fxPerUsd,
            corridor,
          });
        } catch { landed = null; }

        quoteInserts.push({
          orgId: DEMO_ORG.id,
          vendorId: v.id,
          productId: p.id,
          messageId: undefined as unknown as string,
          productNameRaw: p.name,
          unitPriceMinor: Math.round(unitPriceUsd * 100),
          currency: "USD",
          unit,
          quantity: null,
          moq: null,
          origin: v.country ?? "IN",
          packaging: null,
          incoterm,
          destinationPort: "BR-SSZ",
          leadTimeDays: 30 + Math.floor(rand() * 30),
          paymentTerms: "30/70",
          validityUntil: new Date(sentAt.getTime() + 7 * 24 * 3600 * 1000),
          rawExtractedJson: {},
          confidencePerField: {},
          landedCostUsdPerKg: landed,
          capturedAt: sentAt,
          _msgIndex: msgIdx,
        });
      }
    }
  }

  // Insert messages in chunks
  const insertedMessages: { id: string }[] = [];
  const CHUNK = 100;
  for (let i = 0; i < messageInserts.length; i += CHUNK) {
    const inserted = await db.insert(schema.message).values(messageInserts.slice(i, i + CHUNK)).returning({ id: schema.message.id });
    insertedMessages.push(...inserted);
  }

  // Patch quote messageIds and insert
  const finalQuotes = quoteInserts.map(({ _msgIndex, ...rest }) => ({
    ...rest,
    messageId: insertedMessages[_msgIndex].id,
  }));
  for (let i = 0; i < finalQuotes.length; i += CHUNK) {
    await db.insert(schema.quote).values(finalQuotes.slice(i, i + CHUNK));
  }

  // Agent policies
  for (const p of Object.values(DEFAULT_POLICIES)) {
    await db.insert(schema.agentPolicy).values({
      orgId: DEMO_ORG.id,
      agentName: p.agentName,
      enabled: p.enabled,
      autoExecute: p.autoExecute,
      guardrails: p.guardrails as Record<string, number | string | boolean>,
    });
  }

  // Sample alerts
  const sampleAlerts = [
    { sku: "CUMIN-99PURE",     thresholdPerKgUsd: 3.50 },
    { sku: "BLACK-PEPPER-5MM", thresholdPerKgUsd: 4.80 },
    { sku: "CARDAMOM-LARGE",   thresholdPerKgUsd: 27.00 },
  ];
  for (const a of sampleAlerts) {
    await db.insert(schema.alert).values({
      orgId: DEMO_ORG.id,
      kind: "price_below",
      params: { sku: a.sku, thresholdLandedMicros: Math.round(a.thresholdPerKgUsd * 1_000_000) },
      enabled: true,
    });
  }

  // Re-query quotes to get their real IDs
  const { eq } = await import("drizzle-orm");
  const allQuotes = await db.select().from(schema.quote).where(eq(schema.quote.orgId, DEMO_ORG.id));

  // Vendor score tiers
  for (const v of VENDOR_SUBSET) {
    const tier = ["RELIABLE", "RELIABLE", "AGGRESSIVE", "SLOW", "OUTLIER"][Math.floor(rand() * 5)];
    await db.update(schema.vendor).set({ scoreTier: tier }).where(eq(schema.vendor.id, v.id));
  }

  // Generate buy opportunities from the cheapest quotes
  const sortedByLanded = allQuotes.filter((q) => q.landedCostUsdPerKg != null).sort((a, b) => Number(a.landedCostUsdPerKg) - Number(b.landedCostUsdPerKg));
  const oppCount = Math.min(10, sortedByLanded.length);
  for (let i = 0; i < oppCount; i++) {
    const q = sortedByLanded[i];
    const v = vendors.find((x) => x.id === q.vendorId)!;
    const p = products.find((x) => x.id === q.productId);
    await db.insert(schema.buyOpportunity).values({
      orgId: DEMO_ORG.id,
      quoteId: q.id,
      vendorId: q.vendorId,
      productId: q.productId,
      score: 80_000 - i * 5_000,
      reasoningText: `${v.name} is quoting ${p?.name ?? q.productNameRaw} at ${q.currency} ${(Number(q.unitPriceMinor)/100).toFixed(2)}/${q.unit} ${q.incoterm} — below the trailing 30-day median for this SKU.`,
      counterfactualText: `Other vendors in the pool are higher for this SKU.`,
      expiresAt: q.validityUntil,
    });
  }

  // Sample forecasts
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (i % 2 === 0) {
      await db.insert(schema.priceForecast).values({
        orgId: DEMO_ORG.id, productId: p.id, kind: "INSUFFICIENT_DATA", modelVersion: "v1",
      });
    } else {
      const base = BASE_PRICES_USD_PER_KG[p.sku];
      await db.insert(schema.priceForecast).values({
        orgId: DEMO_ORG.id,
        productId: p.id,
        kind: "FORECAST",
        centerMicros: Math.round(base * 1_000_000),
        bandPctMicros: 200_000,
        directionalBias: ["up", "down", "flat"][i % 3],
        confidence: 700,
        modelVersion: "v1",
      });
    }
  }

  // Sample notifications
  await db.insert(schema.notification).values([
    { orgId: DEMO_ORG.id, kind: "alert_triggered", payload: { sku: "CUMIN-99PURE", message: "Cumin dropped below threshold" } },
    { orgId: DEMO_ORG.id, kind: "agent_proposal", payload: { agent: "follow_up", count: 3 } },
  ]);

  // Sample agent runs
  await db.insert(schema.agentRun).values([
    {
      orgId: DEMO_ORG.id,
      agentName: "daily_summary",
      proposedActions: {
        summary: "12 new quotes captured today across 8 vendors. 2 outliers flagged. 3 RFQs awaiting response. 4 open buy opportunities.",
      },
      decision: "auto_executed",
      executedAt: new Date(),
    },
    {
      orgId: DEMO_ORG.id,
      agentName: "buy_now",
      proposedActions: { kind: "scan_complete", created: oppCount },
      decision: "auto_executed",
      executedAt: new Date(),
    },
  ]);

  console.log(`[demo] Seeded: ${products.length} SKUs, ${vendors.length} vendors, ${insertedMessages.length} messages, ${allQuotes.length} quotes, ${oppCount} opportunities.`);
}
