import { describe, it, expect } from "vitest";
import { toUsdMinor } from "./currency";

describe("toUsdMinor", () => {
  const fx = new Map<string, number>([["BRL", 5.10], ["INR", 82.50], ["USD", 1.0]]);

  it("returns identity for USD", () => {
    expect(toUsdMinor(1000, "USD", fx)).toBe(1000);
  });
  it("converts BRL to USD using 1 USD = 5.10 BRL", () => {
    expect(toUsdMinor(5100, "BRL", fx)).toBe(1000);
  });
  it("throws if rate missing", () => {
    expect(() => toUsdMinor(100, "JPY", fx)).toThrow(/JPY/);
  });
});
