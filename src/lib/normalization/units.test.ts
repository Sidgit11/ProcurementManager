import { describe, it, expect } from "vitest";
import { toGrams, perKgFromUnitPrice } from "./units";

describe("toGrams", () => {
  it("kg → grams", () => expect(toGrams(1, "kg")).toBe(1000));
  it("MT → grams", () => expect(toGrams(1, "MT")).toBe(1_000_000));
  it("lb → grams", () => expect(toGrams(1, "lb")).toBeCloseTo(453.592, 2));
  it("sack-50kg → grams", () => expect(toGrams(2, "sack-50kg")).toBe(100_000));
  it("throws unknown unit", () => expect(() => toGrams(1, "weird")).toThrow());
});

describe("perKgFromUnitPrice", () => {
  it("usd/MT → usd/kg", () => {
    expect(perKgFromUnitPrice(500_000, "MT")).toBe(500);
  });
  it("usd/kg passthrough", () => {
    expect(perKgFromUnitPrice(520, "kg")).toBe(520);
  });
});
