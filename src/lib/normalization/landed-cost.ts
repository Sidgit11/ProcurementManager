import { perKgFromUnitPrice } from "./units";
import { toUsdMinor } from "./currency";
import { addFreightForIncoterm, type Corridor, type Incoterm } from "./incoterm";

export interface LandedCostInput {
  unitPriceMinor: number;
  currency: string;
  unit: string;
  incoterm: Incoterm;
  origin: string;
  destinationPort: string;
  fxPerUsd: Map<string, number>;
  corridor: Corridor;
}

// Returns USD micros per kg.
export function computeLandedCostUsdPerKgMicros(i: LandedCostInput): number {
  const usdMinorPerUnit = toUsdMinor(i.unitPriceMinor, i.currency, i.fxPerUsd);
  const usdMinorPerKg = perKgFromUnitPrice(usdMinorPerUnit, i.unit);
  const usdMicrosPerKg = usdMinorPerKg * 10_000; // cents → micros (1 cent = 10_000 micros)
  return addFreightForIncoterm(usdMicrosPerKg, i.incoterm, i.corridor);
}
