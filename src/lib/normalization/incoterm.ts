export type Incoterm = "EXW" | "FOB" | "CFR" | "CIF" | "DAP" | "DDP";

export interface Corridor {
  freightUsdPerKgMicros: number;
  insuranceBps: number;
  dutyBps: number;
}

/**
 * What the SELLER's quoted price already covers, per Incoterms 2020:
 *   EXW — buyer picks up at factory; nothing covered
 *   FOB — seller loads onto ship at origin port; freight/insurance/duty all on buyer
 *   CFR — seller pays freight to destination; buyer adds insurance + duty
 *   CIF — seller pays freight + insurance; buyer adds duty only
 *   DAP — seller delivers to destination port; buyer clears customs (adds duty)
 *   DDP — seller covers everything including duty; buyer adds nothing
 */
const SELLER_COVERS: Record<Incoterm, { freight: boolean; insurance: boolean; duty: boolean }> = {
  EXW: { freight: false, insurance: false, duty: false },
  FOB: { freight: false, insurance: false, duty: false },
  CFR: { freight: true,  insurance: false, duty: false },
  CIF: { freight: true,  insurance: true,  duty: false },
  DAP: { freight: true,  insurance: true,  duty: false },
  DDP: { freight: true,  insurance: true,  duty: true  },
};

export function addFreightForIncoterm(basePerKgMicros: number, incoterm: Incoterm, c: Corridor): number {
  const cov = SELLER_COVERS[incoterm];
  let v = basePerKgMicros;
  if (!cov.freight)   v += c.freightUsdPerKgMicros;
  if (!cov.insurance) v += Math.round(v * (c.insuranceBps / 10_000));
  if (!cov.duty)      v += Math.round(v * (c.dutyBps / 10_000));
  return v;
}
