import { db } from "../db/client";
import { fxRateSnapshot, corridorAssumption } from "../db/schema";

export async function seedFxAndCorridors(orgId: string) {
  // FX snapshot (May 2026 hand-set)
  const fx: { quote: string; ratePerUsd: number }[] = [
    { quote: "BRL", ratePerUsd: 5.10 },
    { quote: "INR", ratePerUsd: 82.50 },
    { quote: "EUR", ratePerUsd: 0.92 },
    { quote: "VND", ratePerUsd: 25_000 },
    { quote: "IDR", ratePerUsd: 15_700 },
    { quote: "TRY", ratePerUsd: 32.40 },
    { quote: "USD", ratePerUsd: 1.0 },
  ];
  for (const r of fx) {
    await db.insert(fxRateSnapshot).values({
      base: "USD",
      quote: r.quote,
      rate: Math.round(r.ratePerUsd * 1_000_000),
    }).onConflictDoNothing({ target: [fxRateSnapshot.base, fxRateSnapshot.quote] });
  }

  // Policy-relevant origin → Santos corridors (USD/kg freight, hand-set)
  const corridors = [
    { origin: "IN", freightUsdPerKg: 0.18 },
    { origin: "VN", freightUsdPerKg: 0.22 },
    { origin: "ID", freightUsdPerKg: 0.21 },
    { origin: "TR", freightUsdPerKg: 0.16 },
    { origin: "BR", freightUsdPerKg: 0.04 },
  ];
  for (const c of corridors) {
    await db.insert(corridorAssumption).values({
      orgId,
      origin: c.origin,
      destinationPort: "BR-SSZ",
      freightUsdPerKg: Math.round(c.freightUsdPerKg * 1_000_000),
      insuranceBps: 50,
      dutyBps: 800,
    }).onConflictDoNothing({ target: [corridorAssumption.orgId, corridorAssumption.origin, corridorAssumption.destinationPort] });
  }
}
