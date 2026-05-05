import { DeltaChip } from "./DeltaChip";

export interface Row {
  vendorId: string;
  vendorName: string;
  country: string | null;
  currency: string;
  unitPriceMinor: number;
  unit: string;
  incoterm: string | null;
  origin: string | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  validityUntil: Date | null;
  landedUsdPerKgMicros: number | null;
}

export function ComparisonTable({
  rows,
  avgLandedMicros,
}: {
  rows: Row[];
  avgLandedMicros: number;
}) {
  const validLanded = rows.map((r) => r.landedUsdPerKgMicros).filter((x): x is number => x != null);
  const best = validLanded.length > 0 ? Math.min(...validLanded) : null;

  return (
    <div className="overflow-x-auto rounded-xl border border-forest-100/40 bg-white/60">
      <table className="min-w-full text-sm">
        <thead className="bg-forest-100/40 text-left text-xs uppercase tracking-wider">
          <tr>
            <th className="p-3">Vendor</th>
            <th className="p-3">Origin</th>
            <th className="p-3">Price</th>
            <th className="p-3">Incoterm</th>
            <th className="p-3">Lead</th>
            <th className="p-3">Validity</th>
            <th className="p-3">Landed USD/kg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isBest = best != null && r.landedUsdPerKgMicros === best;
            const pct = r.landedUsdPerKgMicros != null && avgLandedMicros > 0
              ? ((r.landedUsdPerKgMicros - avgLandedMicros) / avgLandedMicros) * 100
              : 0;
            return (
              <tr key={r.vendorId} className={isBest ? "bg-lime-300/30" : "border-t border-forest-100/30"}>
                <td className="p-3 font-medium">{r.vendorName}</td>
                <td className="p-3">{r.origin ?? "—"}</td>
                <td className="p-3">
                  {r.currency} {(r.unitPriceMinor / 100).toFixed(2)}/{r.unit}
                </td>
                <td className="p-3">{r.incoterm ?? "—"}</td>
                <td className="p-3">{r.leadTimeDays ? `${r.leadTimeDays}d` : "—"}</td>
                <td className="p-3">{r.validityUntil ? new Date(r.validityUntil).toLocaleDateString() : "—"}</td>
                <td className="p-3 font-semibold">
                  {r.landedUsdPerKgMicros != null
                    ? `$${(r.landedUsdPerKgMicros / 1_000_000).toFixed(2)}`
                    : "—"}
                  {r.landedUsdPerKgMicros != null && avgLandedMicros > 0 && <DeltaChip pct={pct} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
