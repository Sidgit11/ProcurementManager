export type Tier = "RELIABLE" | "AGGRESSIVE" | "SLOW" | "OUTLIER";

export interface VendorScoreInput {
  avgResponseSeconds: number;
  priceVsMedianPct: number;
  qualityIssueCount: number;
  quoteCount: number;
}

export function computeVendorTier(i: VendorScoreInput): Tier {
  if (i.priceVsMedianPct >= 10) return "OUTLIER";
  if (i.avgResponseSeconds > 86_400 * 2) return "SLOW";
  if (i.priceVsMedianPct <= -5 && i.qualityIssueCount > 0) return "AGGRESSIVE";
  if (i.avgResponseSeconds <= 86_400 && i.priceVsMedianPct <= 0 && i.qualityIssueCount === 0) return "RELIABLE";
  return i.priceVsMedianPct < 0 ? "AGGRESSIVE" : "SLOW";
}
