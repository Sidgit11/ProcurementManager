import { describe, it, expect } from "vitest";
import { extractQuoteFromMessage } from "./extractor";

describe.skipIf(!process.env.ANTHROPIC_API_KEY)("live extractor", () => {
  it("extracts a simple WhatsApp quote", async () => {
    const r = await extractQuoteFromMessage(
      "Black pepper 5mm available, $5.20/kg CIF Santos, MOQ 1MT, validity 7 days. Payment 30/70.",
      "2026-05-01"
    );
    expect(r.unit_price).toBeCloseTo(5.2, 2);
    expect(r.currency).toBe("USD");
    expect(r.unit).toBe("kg");
    expect(r.incoterm).toBe("CIF");
  }, 30_000);
});
