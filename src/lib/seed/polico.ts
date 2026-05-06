import { db } from "../db/client";
import { org, user, product, vendor, thread, message, quote, vendorContact, rfqTemplate } from "../db/schema";
import { POLICO_CATALOG, BASE_PRICES_USD_PER_KG } from "./catalog";
import { buildVendors } from "./vendors";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";
import { seedFxAndCorridors } from "./fx-and-corridors";
import { seedExtras } from "./extras";
import { derivePoc } from "../vendors/derive";
import { eq, sql } from "drizzle-orm";

export async function seedPolico() {
  // Create org + user
  const [o] = await db.insert(org).values({
    name: "Polico Comercial de Alimentos",
    homeCurrency: "USD",
    homePort: "BR-SSZ",
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
    IN: 180_000, VN: 220_000, ID: 210_000, TR: 160_000, BR: 40_000,
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

  for (const v of vendors) {
    const tId = threadByVendorId.get(v.id)!;
    const skuCount = 3 + Math.floor(Math.random() * 6);
    const skus = [...products].sort(() => Math.random() - 0.5).slice(0, skuCount);

    for (const p of skus) {
      const n = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const daysAgo = Math.floor(Math.random() * 180);
        const sentAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

        const base = BASE_PRICES_USD_PER_KG[p.sku];
        const variance = 0.85 + Math.random() * 0.30;     // ±15%
        const isOutlier = Math.random() < 0.08;
        const factor = isOutlier ? (Math.random() < 0.5 ? 1.18 : 0.82) : variance;
        const usdPerKg = base * factor;

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
          body: `${p.name} available — $${unitPriceUsd.toFixed(2)}/${unit} ${incoterm} Santos. MOQ 1${unit === "MT" ? "MT" : "kg"}. Validity 7 days.`,
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
            destinationPort: "BR-SSZ",
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
          destinationPort: "BR-SSZ",
          leadTimeDays: 30 + Math.floor(Math.random() * 30),
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
      body: "Hi {vendor_name}, hope you're well. Could you share your best price for {product}, CIF Santos, validity 7 days, MOQ 1MT? Including current packaging options. Thanks!",
      spec: { incoterm: "CIF", destinationPort: "BR-SSZ", validityDays: 7 },
    },
    {
      name: "Standard price inquiry — bulk pulses",
      category: "price_inquiry",
      body: "Hi {vendor_name}, please share your best CIF Santos price for {product}, MOQ 20MT, validity 14 days. Mention packaging (50kg PP bags or 25kg) and earliest dispatch window. Thanks.",
      spec: { incoterm: "CIF", destinationPort: "BR-SSZ", validityDays: 14, moq_mt: 20 },
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
      body: "Hi {vendor_name}, can you courier a 200g sample of {product} to our Santos office? We'll need it for a quality check before placing the order. Reference our chat from this week.",
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

  // Post-seed jobs: scoring + opportunity scan + forecasts
  const { recomputeVendorScores } = await import("../scoring/job");
  await recomputeVendorScores(o.id);
  console.log("Recomputed vendor scores.");

  const { scanForOpportunities } = await import("../opportunity/scan");
  const oppResult = await scanForOpportunities(o.id);
  console.log(`Buy-opportunity scan: ${oppResult.created} opportunities.`);

  const { computeForecasts } = await import("../forecast/job");
  await computeForecasts(o.id);
  console.log("Computed forecasts.");
}
