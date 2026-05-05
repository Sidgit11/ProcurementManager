import { anthropic, MODELS } from "../integrations/llm";

export interface DocumentMetadata {
  kind: "CoA" | "certification" | "technical_sheet" | "invoice" | "price_list" | "other";
  issuer: string | null;
  valid_until: string | null;
  key_attributes: Record<string, string | number>;
}

const SYSTEM = `You extract metadata from supplier documents (CoA, certifications, technical sheets, invoices, price lists). Output strict JSON: { kind, issuer, valid_until (ISO yyyy-mm-dd or null), key_attributes (object). } Never invent fields. If the document is illegible, return { kind: "other", issuer: null, valid_until: null, key_attributes: {} }.`;

export async function extractDocumentMetadata(blobUrl: string): Promise<DocumentMetadata> {
  try {
    const r = await anthropic.messages.create({
      model: MODELS.vision,
      max_tokens: 600,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [{ type: "image", source: { type: "url", url: blobUrl } }] }],
    });
    const text = r.content.find((c) => c.type === "text");
    const body = text && "text" in text ? text.text : "{}";
    return JSON.parse(body);
  } catch {
    return { kind: "other", issuer: null, valid_until: null, key_attributes: {} };
  }
}
