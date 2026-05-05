import { db } from "../db/client";
import { quote, vendor } from "../db/schema";
import { eq } from "drizzle-orm";
import { anthropic, MODELS, asCached } from "../integrations/llm";
import { recordRun } from "./runtime";

const SYS = `You draft a single counter-offer message to a supplier. Use only the numbers given. Stay within the target/floor band. Voice: respectful, decisive, short (2-3 sentences). Plain text only, no JSON.`;

export async function runNegotiation(orgId: string, quoteId: string, targetPriceMinor: number, floorPriceMinor: number) {
  const [q] = await db.select().from(quote).where(eq(quote.id, quoteId));
  if (!q) throw new Error("Quote not found");
  const [v] = await db.select().from(vendor).where(eq(vendor.id, q.vendorId));

  const counterPriceMinor = Math.max(floorPriceMinor, Math.min(targetPriceMinor, Math.round(Number(q.unitPriceMinor) * 0.95)));

  let message = "";
  try {
    const r = await anthropic.messages.create({
      model: MODELS.extractor,
      max_tokens: 250,
      system: asCached(SYS),
      messages: [{
        role: "user",
        content: JSON.stringify({
          vendor: v?.name,
          product: q.productNameRaw,
          theirPrice: `${q.currency} ${(Number(q.unitPriceMinor)/100).toFixed(2)}/${q.unit}`,
          counterPrice: `${q.currency} ${(counterPriceMinor/100).toFixed(2)}/${q.unit}`,
          incoterm: q.incoterm,
        }),
      }],
    });
    const text = r.content.find((c) => c.type === "text");
    message = text && "text" in text ? text.text : "";
  } catch {
    message = `Hi ${v?.name ?? "team"} — appreciate your offer. Could you consider ${q.currency} ${(counterPriceMinor/100).toFixed(2)}/${q.unit} given current market levels? Thanks.`;
  }

  return await recordRun({
    orgId,
    agentName: "negotiation",
    inputRef: quoteId,
    proposedActions: { kind: "counter_offer", quoteId, counterPriceMinor, message },
    decision: "pending",
  });
}
