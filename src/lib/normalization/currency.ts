// All amounts in integer minor units (e.g. cents). Returns USD minor.
export function toUsdMinor(amountMinor: number, currency: string, fxPerUsd: Map<string, number>): number {
  const rate = fxPerUsd.get(currency);
  if (!rate) throw new Error(`No FX rate for ${currency}`);
  if (currency === "USD") return amountMinor;
  return Math.round(amountMinor / rate);
}
