import Anthropic from "@anthropic-ai/sdk";
import type { Messages } from "@anthropic-ai/sdk/resources/messages/messages";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "demo-no-key" });

export const MODELS = {
  classifier: process.env.LLM_CLASSIFIER_MODEL ?? "claude-haiku-4-5-20251001",
  extractor:  process.env.LLM_EXTRACTOR_MODEL  ?? "claude-haiku-4-5-20251001",
  vision:     process.env.LLM_VISION_MODEL     ?? "claude-sonnet-4-6",
};

export const hasApiKey = () => !!process.env.ANTHROPIC_API_KEY;

// Static system prompt content gets `cache_control: ephemeral` so we get cache hits
// across messages within the same job (and across jobs within 5 minutes).
//
// The SDK's TextBlockParam already supports cache_control natively (non-beta),
// so we type against it directly rather than defining a custom type.
export type CachedSystem = Messages.TextBlockParam;

export function asCached(text: string): CachedSystem[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }];
}
