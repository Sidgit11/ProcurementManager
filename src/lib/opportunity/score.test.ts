import { describe, it, expect } from "vitest";
import { scoreOpportunity } from "./score";

describe("scoreOpportunity", () => {
  it("high score for big gap + reliable + urgent validity", () => {
    const s = scoreOpportunity({ basePriceGapPct: 0.10, vendorTier: "RELIABLE", hoursToValidity: 12 });
    expect(s).toBeGreaterThan(0.05);
  });
  it("zero score for outlier vendor regardless of price", () => {
    const s = scoreOpportunity({ basePriceGapPct: 0.20, vendorTier: "OUTLIER", hoursToValidity: 4 });
    expect(s).toBe(0);
  });
  it("ignores negative gap (price above median)", () => {
    const s = scoreOpportunity({ basePriceGapPct: -0.05, vendorTier: "RELIABLE", hoursToValidity: 24 });
    expect(s).toBe(0);
  });
});
