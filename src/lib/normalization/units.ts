const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  kg: 1000,
  MT: 1_000_000,
  lb: 453.59237,
  "sack-50kg": 50_000,
  "sack-25kg": 25_000,
  "bag-30kg": 30_000,
};

export function toGrams(qty: number, unit: string): number {
  const f = GRAMS_PER_UNIT[unit];
  if (!f) throw new Error(`Unknown unit: ${unit}`);
  return qty * f;
}

// unitPriceMinor is in *currency minor units* per `unit`. Returns minor units per kg.
export function perKgFromUnitPrice(unitPriceMinor: number, unit: string): number {
  const grams = GRAMS_PER_UNIT[unit];
  if (!grams) throw new Error(`Unknown unit: ${unit}`);
  return Math.round((unitPriceMinor * 1000) / grams);
}
