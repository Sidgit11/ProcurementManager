import { db } from "../db/client";
import { org, user, product, vendor, thread, message, quote } from "../db/schema";
import { POLICO_CATALOG, BASE_PRICES_USD_PER_KG } from "./catalog";
import { buildVendors } from "./vendors";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";
import { seedFxAndCorridors } from "./fx-and-corridors";
import { seedExtras } from "./extras";

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

  // Generate threads, messages, quotes
  const threadInserts: typeof thread.$inferInsert[] = [];
  for (const v of vendors) {
    threadInserts.push({
      orgId: o.id,
      vendorId: v.id,
      channel: "whatsapp_export",
      subject: `Chat with ${v.name}`,
      lastMessageAt: new Date(),
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
  const insertedMessages: { id: string }[] = [];
  const CHUNK = 200;
  for (let i = 0; i < messageInserts.length; i += CHUNK) {
    const part = messageInserts.slice(i, i + CHUNK);
    const inserted = await db.insert(message).values(part).returning({ id: message.id });
    insertedMessages.push(...inserted);
  }

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

  // Seed extras for AI features
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
