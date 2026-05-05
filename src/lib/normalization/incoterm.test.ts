import { describe, it, expect } from "vitest";
import { addFreightForIncoterm, type Corridor } from "./incoterm";

const corridor: Corridor = { freightUsdPerKgMicros: 180_000, insuranceBps: 50, dutyBps: 800 };

describe("addFreightForIncoterm", () => {
  it("FOB adds freight + insurance + duty", () => {
    const r = addFreightForIncoterm(5_000_000, "FOB", corridor);
    expect(r).toBeGreaterThan(5_180_000);
  });
  it("CIF only adds duty (and tiny insurance)", () => {
    const r = addFreightForIncoterm(5_180_000, "CIF", corridor);
    // 0.5% insurance on 5_180_000 = 25_900; +8% duty on (5_180_000 + 25_900) = ~416_472
    expect(r).toBeGreaterThan(5_180_000);
    expect(r).toBeLessThan(5_700_000);
  });
  it("DDP passes through", () => {
    expect(addFreightForIncoterm(5_500_000, "DDP", corridor)).toBe(5_500_000);
  });
});
