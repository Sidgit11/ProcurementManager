import { db } from "../db/client";
import { message, quote, vendor, product, fxRateSnapshot, corridorAssumption, thread } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";

const PRICE_RE = /\$\s?([0-9]+(?:\.[0-9]+)?)\s*\/\s*(kg|MT)\b/i;
const INCOTERM_RE = /\b(EXW|FOB|CFR|CIF|DAP|DDP)\b/;
const VALIDITY_RE = /validity\s+(\d+)\s*(?:days?|d)/i;
const MOQ_RE = /MOQ\s+(\d+(?:\.\d+)?)\s*(MT|kg)/i;
const PAYMENT_RE = /\b(30\/70|50\/50|100% advance|LC at sight|net 30|net 60)\b/i;

const KEYWORDS_TO_SKU: Array<{ keywords: string[]; sku: string }> = [
  { keywords: ["cassia", "cinnamon stick", "ceylon"],            sku: "CASSIA-CINN" },
  { keywords: ["dried apricot", "apricots"],                     sku: "APRICOTS-DRIED" },
  { keywords: ["almond", "almonds"],                             sku: "ALMONDS-NPX" },
  { keywords: ["cumin"],                                         sku: "CUMIN-SEEDS" },
  { keywords: ["turmeric"],                                      sku: "TURMERIC-WHOLE" },
  { keywords: ["onion flake", "dehydrated onion", "onion powder"], sku: "ONION-FLAKES" },
  { keywords: ["dried mixed vegetable", "mixed veg", "dried vegetable", "dried veg"], sku: "DRIED-VEG-MIX" },
];

function classifyLocal(body: string): "quote" | "follow_up" | "document" | "noise" {
  const lc = body.toLowerCase();
  if (/<attached:|file attached/.test(lc)) return "document";
  if (PRICE_RE.test(body) && INCOTERM_RE.test(body)) return "quote";
  if (/validity|payment|moq|confirm|approval/.test(lc) && !/\$/.test(lc)) return "follow_up";
  return "noise";
}

function extractLocal(body: string): {
  unitPriceMinor: number; currency: "USD"; unit: string; incoterm: Incoterm | null;
  validityDays: number | null; moqGrams: number | null; paymentTerms: string | null;
} | null {
  const priceMatch = PRICE_RE.exec(body);
  const incoMatch = INCOTERM_RE.exec(body);
  if (!priceMatch || !incoMatch) return null;
  const price = parseFloat(priceMatch[1]);
  const unit = priceMatch[2].toUpperCase() === "MT" ? "MT" : "kg";
  const incoterm = incoMatch[1] as Incoterm;
  const validityM = VALIDITY_RE.exec(body);
  const moqM = MOQ_RE.exec(body);
  const paymentM = PAYMENT_RE.exec(body);
  return {
    unitPriceMinor: Math.round(price * 100),
    currency: "USD",
    unit,
    incoterm,
    validityDays: validityM ? parseInt(validityM[1], 10) : null,
    moqGrams: moqM
      ? Math.round(parseFloat(moqM[1]) * (moqM[2].toUpperCase() === "MT" ? 1_000_000 : 1000))
      : null,
    paymentTerms: paymentM ? paymentM[1] : null,
  };
}

function inferProductId(
  body: string,
  productCatalog: { id: string; sku: string; name: string }[]
): { id: string; raw: string } | null {
  const lc = body.toLowerCase();
  for (const k of KEYWORDS_TO_SKU) {
    if (k.keywords.some((kw) => lc.includes(kw))) {
      const p = productCatalog.find((pr) => pr.sku === k.sku);
      if (p) return { id: p.id, raw: p.name };
    }
  }
  return null;
}

/** Fast, no-LLM extraction for demo mode. Returns true if a quote was created. */
export async function processMessageDemo(messageId: string): Promise<{ created: boolean }> {
  const [m] = await db.select().from(message).where(eq(message.id, messageId));
  if (!m || m.classification) return { created: false };

  const cls = classifyLocal(m.body);
  await db.update(message).set({ classification: cls }).where(eq(message.id, messageId));
  if (cls !== "quote") return { created: false };

  const ex = extractLocal(m.body);
  if (!ex || !ex.incoterm) return { created: false };

  // Resolve vendor via thread
  const [t] = await db.select().from(thread).where(eq(thread.id, m.threadId));
  if (!t) return { created: false };
  const vendorId = t.vendorId;
  const [v] = await db.select().from(vendor).where(eq(vendor.id, vendorId));

  // Product inference from message body
  const productCatalog = await db
    .select({ id: product.id, sku: product.sku, name: product.name })
    .from(product)
    .where(eq(product.orgId, m.orgId));
  const inferredProduct = inferProductId(m.body, productCatalog);

  // FX rates
  const fxRows = await db.select().from(fxRateSnapshot);
  const fxPerUsd = new Map(fxRows.map((r) => [r.quote, Number(r.rate) / 1_000_000]));

  // Landed cost
  let landedMicros: number | null = null;
  if (v?.country) {
    const [c] = await db.select().from(corridorAssumption).where(
      and(
        eq(corridorAssumption.orgId, m.orgId),
        eq(corridorAssumption.origin, v.country),
        eq(corridorAssumption.destinationPort, "BR-NVT"),
      )
    );
    if (c) {
      try {
        landedMicros = computeLandedCostUsdPerKgMicros({
          unitPriceMinor: ex.unitPriceMinor,
          currency: ex.currency,
          unit: ex.unit,
          incoterm: ex.incoterm,
          origin: v.country,
          destinationPort: "BR-NVT",
          fxPerUsd,
          corridor: {
            freightUsdPerKgMicros: c.freightUsdPerKg,
            insuranceBps: c.insuranceBps,
            dutyBps: c.dutyBps,
          },
        });
      } catch {
        landedMicros = null;
      }
    }
  }

  await db.insert(quote).values({
    orgId: m.orgId,
    vendorId,
    productId: inferredProduct?.id ?? null,
    messageId: m.id,
    productNameRaw: inferredProduct?.raw ?? null,
    unitPriceMinor: ex.unitPriceMinor,
    currency: ex.currency,
    unit: ex.unit,
    quantity: null,
    moq: ex.moqGrams,
    origin: v?.country ?? null,
    packaging: null,
    incoterm: ex.incoterm,
    destinationPort: "BR-NVT",
    leadTimeDays: null,
    paymentTerms: ex.paymentTerms,
    validityUntil: ex.validityDays
      ? new Date((m.sentAt as unknown as Date).valueOf() + ex.validityDays * 86_400_000)
      : null,
    rawExtractedJson: { source: "demo-regex" },
    confidencePerField: { unit_price: 0.95, currency: 0.95, unit: 0.95, incoterm: 0.95 },
    landedCostUsdPerKg: landedMicros,
    capturedAt: m.sentAt,
  });

  return { created: true };
}
