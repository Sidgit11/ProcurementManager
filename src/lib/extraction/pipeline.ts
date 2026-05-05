import { db } from "../db/client";
import { message, quote, fxRateSnapshot, corridorAssumption, thread } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { classify } from "./classifier";
import { extractQuoteFromMessage } from "./extractor";
import { computeLandedCostUsdPerKgMicros } from "../normalization/landed-cost";
import type { Incoterm } from "../normalization/incoterm";
import { evaluateOnQuote } from "../alerts/evaluate";

export async function processMessage(messageId: string): Promise<{ created: boolean }> {
  const [m] = await db.select().from(message).where(eq(message.id, messageId));
  if (!m || m.classification) return { created: false };

  const cls = await classify(m.body);
  await db.update(message).set({ classification: cls.label }).where(eq(message.id, messageId));
  if (cls.label !== "quote") return { created: false };

  const ex = await extractQuoteFromMessage(m.body, m.sentAt.toISOString().slice(0, 10));
  if (ex.unit_price == null || ex.currency == null || ex.unit == null) return { created: false };

  // Resolve vendor via thread (note: do not use messageId as vendorId — common bug!)
  const [t] = await db.select().from(thread).where(eq(thread.id, m.threadId));
  if (!t) return { created: false };
  const vendorId = t.vendorId;

  // Load FX
  const fxRows = await db.select().from(fxRateSnapshot);
  const fxPerUsd = new Map(fxRows.map((r) => [r.quote, r.rate / 1_000_000]));

  // Compute landed cost when origin + incoterm available
  let landedMicros: number | null = null;
  if (ex.origin && ex.incoterm) {
    const [c] = await db.select().from(corridorAssumption).where(
      and(
        eq(corridorAssumption.orgId, m.orgId),
        eq(corridorAssumption.origin, ex.origin),
        eq(corridorAssumption.destinationPort, ex.destination_port ?? "BR-SSZ"),
      )
    );
    if (c) {
      try {
        landedMicros = computeLandedCostUsdPerKgMicros({
          unitPriceMinor: Math.round(ex.unit_price * 100),
          currency: ex.currency,
          unit: ex.unit,
          incoterm: ex.incoterm as Incoterm,
          origin: ex.origin,
          destinationPort: ex.destination_port ?? "BR-SSZ",
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

  const [newQuote] = await db.insert(quote).values({
    orgId: m.orgId,
    vendorId,
    productId: null,
    messageId: m.id,
    productNameRaw: ex.product_name_raw,
    unitPriceMinor: Math.round(ex.unit_price * 100),
    currency: ex.currency,
    unit: ex.unit,
    quantity: ex.quantity != null ? Math.round(ex.quantity * 1000) : null,
    moq: ex.moq != null ? Math.round(ex.moq * 1000) : null,
    origin: ex.origin,
    packaging: ex.packaging,
    incoterm: ex.incoterm,
    destinationPort: ex.destination_port,
    leadTimeDays: ex.lead_time_days,
    paymentTerms: ex.payment_terms,
    validityUntil: ex.validity_until ? new Date(ex.validity_until) : null,
    rawExtractedJson: ex,
    confidencePerField: ex.confidence ?? {},
    landedCostUsdPerKg: landedMicros,
  }).returning();

  await evaluateOnQuote(m.orgId, newQuote.id);

  return { created: true };
}
