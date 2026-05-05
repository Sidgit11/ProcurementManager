import type { Tier } from "../scoring/vendor";

const RELIABILITY: Record<Tier, number> = {
  RELIABLE: 1.0,
  AGGRESSIVE: 0.7,
  SLOW: 0.4,
  OUTLIER: 0.0,
};

export interface OpportunityInput {
  basePriceGapPct: number;     // positive = below median
  vendorTier: Tier;
  hoursToValidity: number;
}

export function scoreOpportunity(i: OpportunityInput): number {
  if (i.basePriceGapPct <= 0) return 0;
  const urgency = Math.max(0, 1 - i.hoursToValidity / 168);
  return i.basePriceGapPct * RELIABILITY[i.vendorTier] * (0.7 + 0.3 * urgency);
}
