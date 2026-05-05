"use client";
import { useMemo, useState } from "react";
import { DeltaChip } from "./DeltaChip";
import { CaretUp, CaretDown, CaretUpDown, FunnelSimple } from "@phosphor-icons/react";

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

type SortKey = "vendorName" | "origin" | "unitPriceMinor" | "incoterm" | "leadTimeDays" | "validityUntil" | "landedUsdPerKgMicros";
type SortDir = "asc" | "desc";

const HEADERS: { key: SortKey; label: string; align?: "left" | "right" }[] = [
  { key: "vendorName",            label: "Vendor" },
  { key: "origin",                label: "Origin" },
  { key: "unitPriceMinor",        label: "Price" },
  { key: "incoterm",              label: "Incoterm" },
  { key: "leadTimeDays",          label: "Lead" },
  { key: "validityUntil",         label: "Validity" },
  { key: "landedUsdPerKgMicros",  label: "Landed USD/kg" },
];

export function ComparisonTable({
  rows,
  avgLandedMicros,
}: {
  rows: Row[];
  avgLandedMicros: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "landedUsdPerKgMicros", dir: "asc" });
  const [incotermFilter, setIncotermFilter] = useState<string>("ALL");
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [filterMenu, setFilterMenu] = useState<"none" | "incoterm" | "origin">("none");

  const incotermOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.incoterm) s.add(r.incoterm);
    return ["ALL", ...[...s].sort()];
  }, [rows]);
  const originOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.origin) s.add(r.origin);
    return ["ALL", ...[...s].sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (incotermFilter !== "ALL" && r.incoterm !== incotermFilter) return false;
      if (originFilter !== "ALL" && r.origin !== originFilter) return false;
      return true;
    });
  }, [rows, incotermFilter, originFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = (a as unknown as Record<SortKey, unknown>)[sort.key];
      const bv = (b as unknown as Record<SortKey, unknown>)[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const validLanded = sorted.map((r) => r.landedUsdPerKgMicros).filter((x): x is number => x != null);
  const best = validLanded.length > 0 ? Math.min(...validLanded) : null;

  function toggleSort(key: SortKey) {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }

  function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) return <CaretUpDown size={11} className="opacity-50 inline-block" />;
    return dir === "asc" ? <CaretUp size={11} className="inline-block" /> : <CaretDown size={11} className="inline-block" />;
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-xs text-forest-500">
        <span>{sorted.length} of {rows.length} vendors shown</span>
        {(incotermFilter !== "ALL" || originFilter !== "ALL") && (
          <button
            onClick={() => { setIncotermFilter("ALL"); setOriginFilter("ALL"); }}
            className="underline hover:text-forest-700"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-forest-100/40 bg-white/60">
        <table className="min-w-full text-sm">
          <thead className="bg-forest-100/40 text-left text-xs uppercase tracking-wider">
            <tr>
              {HEADERS.map((h) => {
                const filterable = h.key === "incoterm" || h.key === "origin";
                const filterValue = h.key === "incoterm" ? incotermFilter : h.key === "origin" ? originFilter : "ALL";
                const filterOpen = filterMenu === h.key;
                return (
                  <th key={h.key} className="p-3 select-none whitespace-nowrap relative">
                    <button
                      type="button"
                      onClick={() => toggleSort(h.key)}
                      className="inline-flex items-center gap-1 hover:text-forest-700"
                    >
                      {h.label} <SortIcon active={sort.key === h.key} dir={sort.dir} />
                    </button>
                    {filterable && (
                      <button
                        type="button"
                        onClick={() => setFilterMenu(filterOpen ? "none" : h.key as "incoterm" | "origin")}
                        className={"ml-1 inline-flex items-center align-middle " + (filterValue !== "ALL" ? "text-forest-700" : "opacity-50")}
                        aria-label={`Filter ${h.label}`}
                      >
                        <FunnelSimple size={11} />
                      </button>
                    )}
                    {filterable && filterOpen && (
                      <div className="absolute z-10 mt-2 left-0 rounded-lg border border-forest-100/60 bg-white p-2 shadow-lg min-w-[8rem]">
                        {(h.key === "incoterm" ? incotermOptions : originOptions).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              if (h.key === "incoterm") setIncotermFilter(opt);
                              else setOriginFilter(opt);
                              setFilterMenu("none");
                            }}
                            className={"block w-full text-left px-2 py-1 text-xs rounded hover:bg-forest-100/50 " + (filterValue === opt ? "bg-lime-300/30 font-semibold" : "")}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={HEADERS.length} className="p-4 text-center text-sm text-forest-500">No vendors match the current filters.</td></tr>
            )}
            {sorted.map((r) => {
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
    </div>
  );
}
