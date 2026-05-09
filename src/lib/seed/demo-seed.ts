import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { POLICO_CATALOG, BASE_PRICES_USD_PER_KG } from "./catalog";
import { buildVendors, POLICO_VENDORS } from "./vendors";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";
import { DEFAULT_POLICIES } from "../agents/policy";
import { DEMO_ORG, DEMO_USER } from "../demo/is-demo";
import { derivePoc } from "../vendors/derive";

const ORIGIN_PORTS: Record<string, string> = {
  IN: "Mundra",          // top Indian export port for spices
  VN: "Haiphong",
  ID: "Tanjung Priok",
  TR: "Mersin",          // south Turkey near Malatya
  CN: "Shanghai",
  EG: "Alexandria",
  ES: "Valencia",
  US: "Long Beach",
  PE: "Callao",
  CA: "Vancouver",
  PK: "Karachi",
  BR: "Santos",
};

function portFor(incoterm: string, country: string | null): string {
  if (incoterm === "FOB" || incoterm === "EXW") {
    return ORIGIN_PORTS[country ?? ""] ?? "origin port";
  }
  return "Navegantes";
}

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
    { origin: "CN", freightUsdPerKg: 0.19 },
    { origin: "EG", freightUsdPerKg: 0.15 },
    { origin: "ES", freightUsdPerKg: 0.13 },
    { origin: "PE", freightUsdPerKg: 0.20 },
    { origin: "US", freightUsdPerKg: 0.14 },
    { origin: "PK", freightUsdPerKg: 0.18 },
    { origin: "BR", freightUsdPerKg: 0.04 },
  ];
  for (const c of corridors) {
    await db.insert(schema.corridorAssumption).values({
      orgId: DEMO_ORG.id,
      origin: c.origin,
      destinationPort: "BR-NVT",   // Navegantes — Polico's actual primary port
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

  // Seed contacts (1 primary, sometimes 1-2 secondary) + preferences per vendor
  const SECONDARY_ROLES = ["Logistics", "Accounts", "QA Lead"];
  const PAYMENT_TERMS = ["30/70", "100% advance", "LC at sight", "50% advance, 50% against B/L"];
  const PREFERRED_CHANNELS: Array<"email" | "whatsapp" | "phone"> = ["email", "whatsapp", "phone"];
  const LANGUAGES_BY_COUNTRY: Record<string, string[]> = {
    IN: ["en", "hi"],
    VN: ["en", "vi"],
    ID: ["en", "id"],
    TR: ["en", "tr"],
    BR: ["en", "pt"],
    EG: ["en", "ar"],
    ES: ["en", "es"],
    CN: ["en", "zh"],
  };

  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    const poc = derivePoc(v.name, v.country, v.primaryContact);
    await db.insert(schema.vendorContact).values({
      vendorId: v.id,
      name: poc.name,
      role: poc.role,
      email: poc.email,
      phone: poc.phone,
      whatsapp: poc.whatsapp,
      isPrimary: true,
      preferredChannel: PREFERRED_CHANNELS[i % 3],
      language: (LANGUAGES_BY_COUNTRY[v.country ?? "IN"] ?? ["en"])[0],
    });
    // ~30% of vendors get a secondary contact
    if (i % 3 === 0) {
      const secondaryName = poc.name.split(" ")[0] + (i % 2 === 0 ? "'s assistant" : "'s logistics lead");
      await db.insert(schema.vendorContact).values({
        vendorId: v.id,
        name: secondaryName,
        role: SECONDARY_ROLES[i % SECONDARY_ROLES.length],
        email: `team${i}@${v.name.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: poc.phone,
        whatsapp: poc.whatsapp,
        isPrimary: false,
        preferredChannel: "email",
        language: (LANGUAGES_BY_COUNTRY[v.country ?? "IN"] ?? ["en"])[0],
      });
    }
    // Preferences
    const { eq: eqDrizzle } = await import("drizzle-orm");
    await db.update(schema.vendor).set({
      preferences: {
        preferredChannel: PREFERRED_CHANNELS[i % 3],
        language: (LANGUAGES_BY_COUNTRY[v.country ?? "IN"] ?? ["en"])[0],
        paymentTerms: PAYMENT_TERMS[i % PAYMENT_TERMS.length],
        currency: "USD",
        leadTimeTolerance: 30 + (i % 4) * 7,
      },
    }).where(eqDrizzle(schema.vendor.id, v.id));
  }

  const fxPerUsd = new Map([
    ["USD", 1.0], ["BRL", 5.10], ["INR", 82.50], ["EUR", 0.92],
    ["VND", 25_000], ["IDR", 15_700], ["TRY", 32.40],
  ]);
  const FREIGHT_MICROS: Record<string, number> = {
    IN: 180_000, VN: 220_000, ID: 210_000, TR: 160_000,
    CN: 190_000, EG: 150_000, ES: 130_000, PE: 200_000,
    US: 140_000, PK: 180_000, BR: 40_000,
  };
  // Threads (one per vendor) — placeholder date; will be backfilled after messages are inserted
  const threadInserts = vendors.map((v) => ({
    orgId: DEMO_ORG.id,
    vendorId: v.id,
    channel: "whatsapp_export" as const,
    subject: `Chat with ${v.name}`,
    lastMessageAt: new Date(0),
  }));
  const insertedThreads = await db.insert(schema.thread).values(threadInserts).returning();
  const threadByVendor = new Map(insertedThreads.map((t) => [t.vendorId, t.id]));

  const messageInserts: Array<typeof schema.message.$inferInsert> = [];
  type QuoteToInsert = typeof schema.quote.$inferInsert & { _msgIndex: number };
  const quoteInserts: QuoteToInsert[] = [];

  // Deterministic-ish randomness so demo data is consistent
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // Map vendor name → seed entry for vendor-aware quote generation
  const vendorSeedByName = new Map(POLICO_VENDORS.map((vs) => [vs.name, vs]));

  for (const v of vendors) {
    const vendorSeedEntry = vendorSeedByName.get(v.name);
    if (!vendorSeedEntry) continue;
    const tId = threadByVendor.get(v.id)!;
    const skuCodes = vendorSeedEntry.primarySkus;
    const productsForVendor = products.filter((p) => skuCodes.includes(p.sku));

    for (const p of productsForVendor) {
      // Quote count proportional to shipmentVolume (1 → 2-3 quotes, 10 → 12-18 quotes over 6 months)
      const n = Math.max(2, Math.round(vendorSeedEntry.shipmentVolume * (0.8 + rand() * 0.6)));
      for (let i = 0; i < n; i++) {
        const daysAgo = Math.floor(rand() * 180);
        const sentAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

        const base = BASE_PRICES_USD_PER_KG[p.sku];
        // Apply vendor pricing bias + random variance (±8%) + occasional outliers (5%)
        const isOutlier = rand() < 0.05;
        const variance = 0.92 + rand() * 0.16;
        const outlierFactor = isOutlier ? (rand() < 0.5 ? 1.18 : 0.85) : 1.0;
        const usdPerKg = base * (1 + (vendorSeedEntry.pricingBias ?? 0)) * variance * outlierFactor;

        const unit = p.defaultUnit;
        const unitPriceUsd = unit === "MT" ? usdPerKg * 1000 : usdPerKg;
        const incoterm: Incoterm = "FOB";

        const msgIdx = messageInserts.length;
        messageInserts.push({
          orgId: DEMO_ORG.id,
          threadId: tId,
          channel: "whatsapp_export",
          direction: "inbound",
          senderName: v.name,
          body: `${p.name} available — $${unitPriceUsd.toFixed(2)}/${unit} ${incoterm} ${portFor(incoterm, v.country)}. MOQ 1${unit === "MT" ? "MT" : "kg"}. Validity 7 days.`,
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
            destinationPort: "BR-NVT",
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
          destinationPort: "BR-NVT",
          leadTimeDays: 30 + Math.floor(rand() * 25),
          paymentTerms: ["30/70", "100% advance", "LC at sight", "50/50"][Math.floor(rand() * 4)],
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

  // Backfill thread.lastMessageAt from the actual most-recent message in each thread.
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    UPDATE thread
    SET last_message_at = sub.max_at
    FROM (
      SELECT thread_id, MAX(sent_at) AS max_at
      FROM message
      WHERE org_id = ${DEMO_ORG.id}
      GROUP BY thread_id
    ) sub
    WHERE thread.id = sub.thread_id
  `);

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

  // Seed RFQ templates (3 categories × 2 each)
  const TEMPLATES = [
    {
      name: "Standard price inquiry — spices",
      category: "price_inquiry",
      body: "Hi {vendor_name}, hope you're well. Could you share your best price for {product}, CIF Navegantes, validity 7 days, MOQ 1MT? Including current packaging options. Thanks!",
      spec: { incoterm: "CIF", destinationPort: "BR-NVT", validityDays: 7 },
    },
    {
      name: "Standard price inquiry — bulk pulses",
      category: "price_inquiry",
      body: "Hi {vendor_name}, please share your best CIF Navegantes price for {product}, MOQ 20MT, validity 14 days. Mention packaging (50kg PP bags or 25kg) and earliest dispatch window. Thanks.",
      spec: { incoterm: "CIF", destinationPort: "BR-NVT", validityDays: 14, moq_mt: 20 },
    },
    {
      name: "Counter-offer — within 5%",
      category: "negotiation",
      body: "Hi {vendor_name}, thanks for your quote on {product}. Given current market levels we'd be looking at {target_price}. Would that work? We can move on volume if so. Best regards.",
      spec: { negotiation: true },
    },
    {
      name: "Counter-offer — request validity extension",
      category: "negotiation",
      body: "Hi {vendor_name}, your quote at {their_price} is competitive. Can you extend validity by another 5 days while we lock our buyer side? Also confirm payment terms.",
      spec: { negotiation: true },
    },
    {
      name: "Document request — CoA + phytosanitary",
      category: "documents",
      body: "Hi {vendor_name}, before we proceed on {product}, please share: (1) latest CoA, (2) phytosanitary certificate template, (3) origin certificate. Also confirm B/L copy timing post-dispatch.",
      spec: { documentTypes: ["CoA", "Phytosanitary", "Origin"] },
    },
    {
      name: "Document request — quality samples",
      category: "documents",
      body: "Hi {vendor_name}, can you courier a 200g sample of {product} to our Navegantes office? We'll need it for a quality check before placing the order. Reference our chat from this week.",
      spec: { documentTypes: ["Sample"] },
    },
  ];

  for (const t of TEMPLATES) {
    await db.insert(schema.rfqTemplate).values({
      orgId: DEMO_ORG.id,
      name: t.name,
      category: t.category,
      body: t.body,
      specScaffold: t.spec as Record<string, unknown>,
    });
  }

  // Sample alerts
  const sampleAlerts = [
    { sku: "CUMIN-SEEDS",      thresholdPerKgUsd: 3.80 },
    { sku: "TURMERIC-WHOLE",   thresholdPerKgUsd: 1.85 },
    { sku: "APRICOTS-DRIED",   thresholdPerKgUsd: 4.00 },
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
  for (const v of vendors) {
    const tier = ["RELIABLE", "RELIABLE", "AGGRESSIVE", "SLOW", "OUTLIER"][Math.floor(rand() * 5)];
    await db.update(schema.vendor).set({ scoreTier: tier }).where(eq(schema.vendor.id, v.id));
  }

  // Re-query vendors after tier update
  const allVendors = await db.select().from(schema.vendor).where(eq(schema.vendor.orgId, DEMO_ORG.id));
  const vendorById = new Map(allVendors.map((v) => [v.id, v]));
  const productById = new Map(products.map((p) => [p.id, p]));

  // Helper: pick one quote per SKU with optional tier preference
  function pickQuote(opts: { sku: string; preferTier?: string }): typeof allQuotes[number] | null {
    const product = products.find((p) => p.sku === opts.sku);
    if (!product) return null;
    let candidates = allQuotes.filter((q) =>
      q.productId === product.id &&
      q.landedCostUsdPerKg != null
    );
    if (opts.preferTier) {
      const preferredCandidates = candidates.filter((q) => {
        const v = vendorById.get(q.vendorId);
        return v?.scoreTier === opts.preferTier;
      });
      if (preferredCandidates.length > 0) candidates = preferredCandidates;
    }
    // Sort by lowest landed cost (best deal first)
    candidates.sort((a, b) => Number(a.landedCostUsdPerKg) - Number(b.landedCostUsdPerKg));
    return candidates[0] ?? null;
  }

  // Define the 5 picks with variety
  const opportunityPicks: Array<{ sku: string; preferTier?: string; expiresInDays: number; rationaleVariant: "high-gap" | "urgent" | "reliable-deep" | "premium-deal" | "competitor-undercut" }> = [
    // 1. High-conviction: cassia from Tuan Minh (RELIABLE), strong gap
    { sku: "CASSIA-CINN",    preferTier: "RELIABLE",   expiresInDays: 5,  rationaleVariant: "reliable-deep" },
    // 2. Urgent expiry: cumin, 24h validity
    { sku: "CUMIN-SEEDS",    preferTier: "RELIABLE",   expiresInDays: 1,  rationaleVariant: "urgent" },
    // 3. Aggressive vendor undercutting market on dried veg
    { sku: "DRIED-VEG-MIX",  preferTier: "AGGRESSIVE", expiresInDays: 7,  rationaleVariant: "competitor-undercut" },
    // 4. Apricots — premium positioning vendor with a brief allocation deal
    { sku: "APRICOTS-DRIED",                            expiresInDays: 4,  rationaleVariant: "premium-deal" },
    // 5. Onion flakes — biggest gap from a Chinese vendor
    { sku: "ONION-FLAKES",   preferTier: "AGGRESSIVE", expiresInDays: 6,  rationaleVariant: "high-gap" },
  ];

  let oppNum = 0;
  for (const pick of opportunityPicks) {
    const q = pickQuote(pick);
    if (!q) continue;
    const v = vendorById.get(q.vendorId)!;
    const p = q.productId ? productById.get(q.productId) : null;
    const landed = Number(q.landedCostUsdPerKg);
    const priceLabel = `${q.currency} ${(Number(q.unitPriceMinor) / 100).toFixed(2)}/${q.unit}`;
    const landedLabel = `$${(landed / 1_000_000).toFixed(2)}/kg`;

    let reasoning = "";
    let counterfactual = "";
    switch (pick.rationaleVariant) {
      case "reliable-deep":
        reasoning = `${v.name} is quoting ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed) — about 7% below the trailing 30-day median. Score tier RELIABLE: clean delivery history, fast response on RFQs, BC1 grade with verified 8.5% oil content.`;
        counterfactual = "Two other vendors in your pool are 4-6% higher for the same grade. This is a textbook 'long-term partner with a good price' setup — book the volume.";
        break;
      case "urgent":
        reasoning = `${v.name} just sent ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed). Validity expires within 24 hours — they need a yes or it goes to the next buyer. Price is competitive, RELIABLE tier on past supply.`;
        counterfactual = "If you let this lapse, expect to wait 5-7 days for the next quote round at likely 2-4% higher.";
        break;
      case "competitor-undercut":
        reasoning = `${v.name} is undercutting your other dried-veg suppliers by ~6% on ${p?.name ?? "this SKU"} (${priceLabel}, landed ${landedLabel}). AGGRESSIVE tier — they hit price aggressively but have inconsistent QC; sample-test the first container.`;
        counterfactual = "Your other Egyptian and Chinese veg vendors are quoting 4-7% above this. Worth a small first-trial order before committing volume.";
        break;
      case "premium-deal":
        reasoning = `${v.name} is offering ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed) — a rare allocation discount from a premium-positioning vendor. Their average is usually 8-12% above this price.`;
        counterfactual = "If you skip, they'll go back to standard premium pricing. Locking now means above-spec quality at a non-premium price for one cycle.";
        break;
      case "high-gap":
        reasoning = `${v.name} is quoting ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed) — the biggest price gap in your pool right now, ~9% below median. AGGRESSIVE tier on volume; check loading-port lead time.`;
        counterfactual = "Your other vendors are clustered near the median; this one is the outlier downside. Verify lead time before committing.";
        break;
    }

    await db.insert(schema.buyOpportunity).values({
      orgId: DEMO_ORG.id,
      quoteId: q.id,
      vendorId: q.vendorId,
      productId: q.productId,
      score: 60_000 + oppNum * 8_000 + Math.floor(rand() * 15_000),
      reasoningText: reasoning,
      counterfactualText: counterfactual,
      expiresAt: new Date(Date.now() + pick.expiresInDays * 86_400_000),
    });
    oppNum++;
  }

  const oppCount = oppNum;

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
    { orgId: DEMO_ORG.id, kind: "alert_triggered", payload: { sku: "CUMIN-SEEDS", message: "Cumin seeds dropped below threshold" } },
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
