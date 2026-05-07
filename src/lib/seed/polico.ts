import { db } from "../db/client";
import { org, user, product, vendor, thread, message, quote, vendorContact, rfqTemplate } from "../db/schema";
import { POLICO_CATALOG, BASE_PRICES_USD_PER_KG } from "./catalog";
import { buildVendors, POLICO_VENDORS } from "./vendors";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";
import { seedFxAndCorridors } from "./fx-and-corridors";
import { seedExtras } from "./extras";
import { derivePoc } from "../vendors/derive";
import { eq, sql } from "drizzle-orm";

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

export async function seedPolico() {
  // Create org + user
  const [o] = await db.insert(org).values({
    name: "Polico Comercial de Alimentos",
    homeCurrency: "USD",
    homePort: "BR-NVT",
  }).returning();

  await db.insert(user).values({
    orgId: o.id,
    email: "lucas@polico.example",
    name: "Lucas Oliveira",
    role: "owner",
  });

  await seedFxAndCorridors(o.id);

  // Insert products
  const products = await db.insert(product).values(
    POLICO_CATALOG.map((p) => ({ ...p, orgId: o.id }))
  ).returning();

  // Insert vendors
  const vendors = await db.insert(vendor).values(buildVendors(o.id)).returning();

  // Seed contacts (1 primary, sometimes 1 secondary) + preferences per vendor
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
    await db.insert(vendorContact).values({
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
    // ~33% of vendors get a secondary contact
    if (i % 3 === 0) {
      const secondaryName = poc.name.split(" ")[0] + (i % 2 === 0 ? "'s assistant" : "'s logistics lead");
      await db.insert(vendorContact).values({
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
    // Set vendor.preferences jsonb
    await db.update(vendor).set({
      preferences: {
        preferredChannel: PREFERRED_CHANNELS[i % 3],
        language: (LANGUAGES_BY_COUNTRY[v.country ?? "IN"] ?? ["en"])[0],
        paymentTerms: PAYMENT_TERMS[i % PAYMENT_TERMS.length],
        currency: "USD",
        leadTimeTolerance: 30 + (i % 4) * 7,
      },
    }).where(eq(vendor.id, v.id));
  }

  // FX rates (must match seedFxAndCorridors)
  const fxPerUsd = new Map([
    ["USD", 1.0], ["BRL", 5.10], ["INR", 82.50], ["EUR", 0.92],
    ["VND", 25_000], ["IDR", 15_700], ["TRY", 32.40],
  ]);

  // Corridor freight per origin (USD/kg micros) — matches seedFxAndCorridors
  const FREIGHT_MICROS: Record<string, number> = {
    IN: 180_000, VN: 220_000, ID: 210_000, TR: 160_000,
    CN: 190_000, EG: 150_000, ES: 130_000, PE: 200_000,
    US: 140_000, PK: 180_000, BR: 40_000,
  };

  const incoterms = ["CIF", "FOB", "DAP"] as const;

  // Generate threads — placeholder date; will be backfilled after messages are inserted
  const threadInserts: typeof thread.$inferInsert[] = [];
  for (const v of vendors) {
    threadInserts.push({
      orgId: o.id,
      vendorId: v.id,
      channel: "whatsapp_export",
      subject: `Chat with ${v.name}`,
      lastMessageAt: new Date(0),
    });
  }
  const insertedThreads = await db.insert(thread).values(threadInserts).returning();
  const threadByVendorId = new Map(insertedThreads.map((t) => [t.vendorId, t.id]));

  // For each vendor, pick 3-8 random SKUs, generate 1-4 quotes per (vendor, sku)
  const messageInserts: typeof message.$inferInsert[] = [];
  type QuoteToInsert = typeof quote.$inferInsert & { _msgIndex: number };
  const quoteInserts: QuoteToInsert[] = [];

  // Map vendor name → seed entry for vendor-aware quote generation
  const vendorSeedByName = new Map(POLICO_VENDORS.map((vs) => [vs.name, vs]));

  for (const v of vendors) {
    const seed = vendorSeedByName.get(v.name);
    if (!seed) continue;
    const tId = threadByVendorId.get(v.id)!;
    const skuCodes = seed.primarySkus;
    const productsForVendor = products.filter((p) => skuCodes.includes(p.sku));

    for (const p of productsForVendor) {
      // Quote count proportional to shipmentVolume (1 → 2-3 quotes, 10 → 12-18 quotes over 6 months)
      const n = Math.max(2, Math.round(seed.shipmentVolume * (0.8 + Math.random() * 0.6)));
      for (let i = 0; i < n; i++) {
        const daysAgo = Math.floor(Math.random() * 180);
        const sentAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

        const base = BASE_PRICES_USD_PER_KG[p.sku];
        // Apply vendor pricing bias + random variance (±8%) + occasional outliers (5%)
        const isOutlier = Math.random() < 0.05;
        const variance = 0.92 + Math.random() * 0.16;
        const outlierFactor = isOutlier ? (Math.random() < 0.5 ? 1.18 : 0.85) : 1.0;
        const usdPerKg = base * (1 + (seed.pricingBias ?? 0)) * variance * outlierFactor;

        const unit = p.defaultUnit;
        const unitPriceUsd = unit === "MT" ? usdPerKg * 1000 : usdPerKg;
        const incoterm: Incoterm = incoterms[Math.floor(Math.random() * incoterms.length)];

        const msgIdx = messageInserts.length;
        messageInserts.push({
          orgId: o.id,
          threadId: tId,
          channel: "whatsapp_export",
          direction: "inbound",
          senderName: v.name,
          body: `${p.name} available — $${unitPriceUsd.toFixed(2)}/${unit} ${incoterm} ${portFor(incoterm, v.country)}. MOQ 1${unit === "MT" ? "MT" : "kg"}. Validity 7 days.`,
          sentAt,
          classification: "quote",
        });

        // Compute landed cost
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
        } catch {
          landed = null;
        }

        quoteInserts.push({
          orgId: o.id,
          vendorId: v.id,
          productId: p.id,
          messageId: undefined as unknown as string, // patched after message insert
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
          leadTimeDays: 30 + Math.floor(Math.random() * 25),
          paymentTerms: ["30/70", "100% advance", "LC at sight", "50/50"][Math.floor(Math.random() * 4)],
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

  // Insert messages in chunks (Postgres has parameter limits)
  // Note: .returning() without column args — drizzle-orm pg-core doesn't support partial returning
  const insertedMessages: { id: string }[] = [];
  const CHUNK = 200;
  for (let i = 0; i < messageInserts.length; i += CHUNK) {
    const part = messageInserts.slice(i, i + CHUNK);
    const inserted = await db.insert(message).values(part).returning();
    insertedMessages.push(...inserted.map((r) => ({ id: r.id })));
  }

  // Backfill thread.lastMessageAt from MAX(message.sent_at) per thread
  await db.execute(sql`
    UPDATE thread
    SET last_message_at = sub.max_at
    FROM (
      SELECT thread_id, MAX(sent_at) AS max_at
      FROM message
      WHERE org_id = ${o.id}
      GROUP BY thread_id
    ) sub
    WHERE thread.id = sub.thread_id
  `);

  // Patch quotes with messageId now that messages have ids
  const finalQuotes = quoteInserts.map((q) => {
    const { _msgIndex, ...rest } = q;
    return { ...rest, messageId: insertedMessages[_msgIndex].id };
  });

  // Insert quotes in chunks too
  for (let i = 0; i < finalQuotes.length; i += CHUNK) {
    const part = finalQuotes.slice(i, i + CHUNK);
    await db.insert(quote).values(part);
  }

  console.log(
    `Seeded Polico: ${products.length} products, ${vendors.length} vendors, ${insertedMessages.length} messages, ${finalQuotes.length} quotes.`
  );

  // Seed RFQ templates (3 categories × 2 each) — mirrors demo-seed
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
    await db.insert(rfqTemplate).values({
      orgId: o.id,
      name: t.name,
      category: t.category,
      body: t.body,
      specScaffold: t.spec as Record<string, unknown>,
    });
  }

  // Seed extras for AI features (agent_policy, vendor_note, quality_event, document, alert, chat_session)
  await seedExtras(o.id);

  // Post-seed jobs: scoring + forecasts
  const { recomputeVendorScores } = await import("../scoring/job");
  await recomputeVendorScores(o.id);
  console.log("Recomputed vendor scores.");

  // Re-query all data for curated opportunity picks
  const allQuotes = await db.select().from(quote).where(eq(quote.orgId, o.id));
  const allVendors = await db.select().from(vendor).where(eq(vendor.orgId, o.id));
  const allProducts = await db.select().from(product).where(eq(product.orgId, o.id));
  const vendorById = new Map(allVendors.map((v) => [v.id, v]));
  const productById = new Map(allProducts.map((p) => [p.id, p]));

  // Helper: pick one quote per SKU with optional tier preference
  function pickQuote(opts: { sku: string; preferTier?: string }): typeof allQuotes[number] | null {
    const prod = allProducts.find((p) => p.sku === opts.sku);
    if (!prod) return null;
    let candidates = allQuotes.filter((q) =>
      q.productId === prod.id &&
      q.landedCostUsdPerKg != null
    );
    if (opts.preferTier) {
      const preferredCandidates = candidates.filter((q) => {
        const v = vendorById.get(q.vendorId);
        return v?.scoreTier === opts.preferTier;
      });
      if (preferredCandidates.length > 0) candidates = preferredCandidates;
    }
    candidates.sort((a, b) => Number(a.landedCostUsdPerKg) - Number(b.landedCostUsdPerKg));
    return candidates[0] ?? null;
  }

  const opportunityPicks: Array<{ sku: string; preferTier?: string; expiresInDays: number; rationaleVariant: "high-gap" | "urgent" | "reliable-deep" | "premium-deal" | "competitor-undercut" }> = [
    { sku: "CASSIA-CINN",    preferTier: "RELIABLE",   expiresInDays: 5,  rationaleVariant: "reliable-deep" },
    { sku: "CUMIN-SEEDS",    preferTier: "RELIABLE",   expiresInDays: 1,  rationaleVariant: "urgent" },
    { sku: "DRIED-VEG-MIX",  preferTier: "AGGRESSIVE", expiresInDays: 7,  rationaleVariant: "competitor-undercut" },
    { sku: "APRICOTS-DRIED",                            expiresInDays: 4,  rationaleVariant: "premium-deal" },
    { sku: "ONION-FLAKES",   preferTier: "AGGRESSIVE", expiresInDays: 6,  rationaleVariant: "high-gap" },
  ];

  const { buyOpportunity } = await import("../db/schema");
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
        reasoning = `${v.name} is quoting ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed) — about 7% below the trailing 30-day median. Score tier RELIABLE: clean delivery history, fast response on RFQs.`;
        counterfactual = "Two other vendors in your pool are 4-6% higher for the same grade. Book the volume.";
        break;
      case "urgent":
        reasoning = `${v.name} just sent ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed). Validity expires within 24 hours — they need a yes or it goes to the next buyer.`;
        counterfactual = "If you let this lapse, expect to wait 5-7 days for the next quote round at likely 2-4% higher.";
        break;
      case "competitor-undercut":
        reasoning = `${v.name} is undercutting your other dried-veg suppliers by ~6% on ${p?.name ?? "this SKU"} (${priceLabel}, landed ${landedLabel}). AGGRESSIVE tier — sample-test the first container.`;
        counterfactual = "Your other veg vendors are quoting 4-7% above this. Worth a small first-trial order before committing volume.";
        break;
      case "premium-deal":
        reasoning = `${v.name} is offering ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed) — a rare allocation discount from a premium-positioning vendor.`;
        counterfactual = "If you skip, they'll go back to standard premium pricing. Locking now means above-spec quality at a non-premium price for one cycle.";
        break;
      case "high-gap":
        reasoning = `${v.name} is quoting ${p?.name ?? "this SKU"} at ${priceLabel} (${landedLabel} landed) — the biggest price gap in your pool right now, ~9% below median.`;
        counterfactual = "Your other vendors are clustered near the median; this one is the outlier downside. Verify lead time before committing.";
        break;
    }

    await db.insert(buyOpportunity).values({
      orgId: o.id,
      quoteId: q.id,
      vendorId: q.vendorId,
      productId: q.productId,
      score: 60_000 + oppNum * 8_000 + Math.floor(Math.random() * 15_000),
      reasoningText: reasoning,
      counterfactualText: counterfactual,
      expiresAt: new Date(Date.now() + pick.expiresInDays * 86_400_000),
    });
    oppNum++;
  }
  console.log(`[polico] Created ${oppNum} curated buy opportunities.`);

  const { computeForecasts } = await import("../forecast/job");
  await computeForecasts(o.id);
  console.log("Computed forecasts.");
}
