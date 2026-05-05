import { describe, it, expect } from "vitest";
import { computeLandedCostUsdPerKgMicros } from "./landed-cost";

describe("computeLandedCostUsdPerKgMicros", () => {
  it("$5.20/kg CIF Santos from India ⇒ adds 8% duty + 0.5% insurance", () => {
    const v = computeLandedCostUsdPerKgMicros({
      unitPriceMinor: 520, currency: "USD", unit: "kg",
      incoterm: "CIF", origin: "IN", destinationPort: "BR-SSZ",
      fxPerUsd: new Map([["USD", 1.0]]),
      corridor: { freightUsdPerKgMicros: 180_000, insuranceBps: 50, dutyBps: 800 },
    });
    expect(v).toBeGreaterThan(5_500_000);
    expect(v).toBeLessThan(6_000_000);
  });
});
