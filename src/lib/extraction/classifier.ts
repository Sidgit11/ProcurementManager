import { anthropic, MODELS, asCached } from "../integrations/llm";
import { CLASSIFIER_V1 } from "./prompts/classifier.v1";

export type Classification = "quote" | "follow_up" | "document" | "noise";

export async function classify(messageBody: string): Promise<{ label: Classification; reason: string }> {
  const r = await anthropic.messages.create({
    model: MODELS.classifier,
    max_tokens: 100,
    system: asCached(CLASSIFIER_V1),
    messages: [{ role: "user", content: messageBody.slice(0, 4000) }],
  });
  const text = (r.content.find((c) => c.type === "text") as { type: "text"; text: string } | undefined)?.text ?? "{}";
  try {
    const j = JSON.parse(text) as { label?: Classification; reason?: string };
    return { label: j.label ?? "noise", reason: j.reason ?? "" };
  } catch {
    return { label: "noise", reason: "unparsable model output" };
  }
}
