import { anthropic, MODELS, asCached } from "../integrations/llm";
import { EXTRACTOR_V1 } from "./prompts/extractor.v1";

export interface ExtractedQuote {
  product_name_raw: string | null;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  quantity: number | null;
  moq: number | null;
  origin: string | null;
  packaging: string | null;
  incoterm: string | null;
  destination_port: string | null;
  lead_time_days: number | null;
  payment_terms: string | null;
  validity_until: string | null;
  confidence: Record<string, number>;
}

export async function extractQuoteFromMessage(body: string, messageDateIso: string): Promise<ExtractedQuote> {
  const r = await anthropic.messages.create({
    model: MODELS.extractor,
    max_tokens: 600,
    system: asCached(EXTRACTOR_V1),
    messages: [{ role: "user", content: `message_date: ${messageDateIso}\n\n${body.slice(0, 4000)}` }],
  });
  const text = (r.content.find((c) => c.type === "text") as { type: "text"; text: string } | undefined)?.text ?? "{}";
  try {
    return JSON.parse(text) as ExtractedQuote;
  } catch {
    return blank();
  }
}

function blank(): ExtractedQuote {
  return {
    product_name_raw: null, unit_price: null, currency: null, unit: null,
    quantity: null, moq: null, origin: null, packaging: null,
    incoterm: null, destination_port: null, lead_time_days: null,
    payment_terms: null, validity_until: null, confidence: {},
  };
}
