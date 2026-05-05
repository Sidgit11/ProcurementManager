import { describe, it, expect } from "vitest";
import { computeVendorTier } from "./vendor";

describe("computeVendorTier", () => {
  it("RELIABLE when fast + competitive", () => {
    const r = computeVendorTier({ avgResponseSeconds: 3600, priceVsMedianPct: -2, qualityIssueCount: 0, quoteCount: 12 });
    expect(r).toBe("RELIABLE");
  });
  it("AGGRESSIVE when very competitive but inconsistent", () => {
    const r = computeVendorTier({ avgResponseSeconds: 7200, priceVsMedianPct: -8, qualityIssueCount: 1, quoteCount: 8 });
    expect(r).toBe("AGGRESSIVE");
  });
  it("SLOW when slow response", () => {
    const r = computeVendorTier({ avgResponseSeconds: 86_400 * 3, priceVsMedianPct: 1, qualityIssueCount: 0, quoteCount: 5 });
    expect(r).toBe("SLOW");
  });
  it("OUTLIER when consistently overpriced", () => {
    const r = computeVendorTier({ avgResponseSeconds: 7200, priceVsMedianPct: 14, qualityIssueCount: 0, quoteCount: 8 });
    expect(r).toBe("OUTLIER");
  });
});
