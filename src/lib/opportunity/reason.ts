import { anthropic, MODELS, asCached } from "../integrations/llm";

const SYSTEM = `You write 2-sentence buy-opportunity rationales for a procurement operator. Use only the numbers given. Never invent vendor names or prices. Voice: calm, decisive, executive. Output plain text only, no JSON, no headers.`;

export interface ReasoningInput {
  product: string;
  vendorName: string;
  vendorTier: string;
  unitPrice: string;
  landedUsdPerKg: number;
  trailingMedianUsdPerKg: number;
  basePriceGapPct: number;
  hoursToValidity: number;
}

export async function draftReasoning(input: ReasoningInput): Promise<string> {
  try {
    const r = await anthropic.messages.create({
      model: MODELS.extractor,
      max_tokens: 200,
      system: asCached(SYSTEM),
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    const text = r.content.find((c) => c.type === "text");
    return text && "text" in text ? text.text : "";
  } catch {
    return "";
  }
}
