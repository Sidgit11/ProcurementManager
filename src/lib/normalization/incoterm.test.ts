import { describe, it, expect } from "vitest";
import { addFreightForIncoterm, type Corridor } from "./incoterm";

const corridor: Corridor = { freightUsdPerKgMicros: 180_000, insuranceBps: 50, dutyBps: 800 };
const base = 5_000_000; // $5/kg micros

describe("addFreightForIncoterm", () => {
  it("EXW adds freight + insurance + duty", () => {
    const r = addFreightForIncoterm(base, "EXW", corridor);
    expect(r).toBeGreaterThan(base + corridor.freightUsdPerKgMicros);
  });
  it("FOB adds freight + insurance + duty (same as EXW for our model)", () => {
    const fob = addFreightForIncoterm(base, "FOB", corridor);
    const exw = addFreightForIncoterm(base, "EXW", corridor);
    expect(fob).toBe(exw);
  });
  it("CFR skips freight, adds insurance + duty", () => {
    const r = addFreightForIncoterm(base, "CFR", corridor);
    // No freight added: result is between base and base+freight
    // Insurance (0.5%) + duty (8%) on base = ~8.5% more than base
    // That's less than freight ($180k) when base is $5/kg? No: 8.5% of 5M = 425k > 180k.
    // So: r > base but r < base + freight is wrong when insurance+duty > freight.
    // Correct: r is base + insurance-on-base + duty-on-(base+insurance)
    const afterInsurance = base + Math.round(base * (corridor.insuranceBps / 10_000));
    const afterDuty = afterInsurance + Math.round(afterInsurance * (corridor.dutyBps / 10_000));
    expect(r).toBe(afterDuty);
  });
  it("CIF skips freight AND insurance — duty only", () => {
    const r = addFreightForIncoterm(base, "CIF", corridor);
    expect(r).toBe(base + Math.round(base * 0.08)); // 8% duty (800 bps)
  });
  it("DAP skips freight + insurance — duty only", () => {
    const r = addFreightForIncoterm(base, "DAP", corridor);
    expect(r).toBe(base + Math.round(base * 0.08));
  });
  it("DDP passes through unchanged", () => {
    expect(addFreightForIncoterm(base, "DDP", corridor)).toBe(base);
  });
});
