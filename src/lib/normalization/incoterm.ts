export type Incoterm = "EXW" | "FOB" | "CFR" | "CIF" | "DAP" | "DDP";

export interface Corridor {
  freightUsdPerKgMicros: number;
  insuranceBps: number;
  dutyBps: number;
}

export function addFreightForIncoterm(basePerKgMicros: number, incoterm: Incoterm, c: Corridor): number {
  let v = basePerKgMicros;
  if (incoterm === "EXW" || incoterm === "FOB") v += c.freightUsdPerKgMicros;
  if (incoterm !== "DDP") v += Math.round(v * (c.insuranceBps / 10_000));
  if (incoterm !== "DDP") v += Math.round(v * (c.dutyBps / 10_000));
  return v;
}
