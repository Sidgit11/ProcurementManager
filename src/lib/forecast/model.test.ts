import { describe, it, expect } from "vitest";
import { forecastFromHistory } from "./model";

describe("forecastFromHistory", () => {
  it("returns INSUFFICIENT_DATA when fewer than 30 quotes", () => {
    const r = forecastFromHistory(Array.from({ length: 10 }, (_, i) => ({ day: i, landed: 5_000_000 })));
    expect(r.kind).toBe("INSUFFICIENT_DATA");
  });
  it("rising trend when 7d > 30d", () => {
    const days = Array.from({ length: 60 }, (_, i) => ({ day: i, landed: 5_000_000 + i * 10_000 }));
    const r = forecastFromHistory(days);
    expect(r.kind).toBe("FORECAST");
    if (r.kind === "FORECAST") expect(r.directionalBias).toBe("up");
  });
});
