"use client";
import { useEffect, useState } from "react";

interface Row { sku: string; name: string; week: string; n: number | string }

export function DensityHeatmap() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights/density")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-forest-500">Loading…</div>;
  if (rows.length === 0) return <div className="text-sm text-forest-500">No data yet.</div>;

  // Build matrix: SKUs x weeks
  const skus = Array.from(new Set(rows.map((r) => r.name))).sort();
  const weeks = Array.from(new Set(rows.map((r) => r.week))).sort();
  const matrix: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    matrix[r.name] ??= {};
    matrix[r.name][r.week] = Number(r.n);
  }

  // Compute per-row max for relative shading
  const maxPerSku: Record<string, number> = {};
  for (const sku of skus) {
    let m = 0;
    for (const w of weeks) m = Math.max(m, matrix[sku]?.[w] ?? 0);
    maxPerSku[sku] = m;
  }

  function cellColor(n: number, max: number): string {
    if (n === 0 || max === 0) return "bg-forest-100/40";
    const intensity = n / max;
    if (intensity > 0.75) return "bg-lime-500";
    if (intensity > 0.50) return "bg-lime-400";
    if (intensity > 0.25) return "bg-lime-300";
    return "bg-lime-300/40";
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-3 text-[11px] text-forest-500 mb-3">
        <span>Density:</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-forest-100/40 border border-forest-100" /> 0 quotes</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-lime-300/40" /> sparse</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-lime-300" /> moderate</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-lime-400" /> active</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-lime-500" /> heavy</span>
      </div>
      <table className="text-xs">
        <thead>
          <tr>
            <th className="text-left pr-3 sticky left-0 bg-white/0">SKU</th>
            {weeks.map((w) => (
              <th key={w} className="px-1 text-forest-500 font-normal whitespace-nowrap">
                {new Date(w).toISOString().slice(5, 10)}
              </th>
            ))}
            <th className="pl-3 text-forest-500 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => {
            const total = weeks.reduce((acc, w) => acc + (matrix[sku]?.[w] ?? 0), 0);
            return (
              <tr key={sku}>
                <td className="pr-3 py-0.5 font-medium text-forest-700 whitespace-nowrap">{sku}</td>
                {weeks.map((w) => {
                  const n = matrix[sku]?.[w] ?? 0;
                  return (
                    <td key={w} className="px-0.5 py-0.5">
                      <div title={`${n} quote${n === 1 ? "" : "s"} in week of ${new Date(w).toISOString().slice(0, 10)}`}
                        className={`w-7 h-5 rounded ${cellColor(n, maxPerSku[sku])} border border-forest-100/30 flex items-center justify-center text-[10px] text-forest-700 font-medium`}>
                        {n > 0 ? n : ""}
                      </div>
                    </td>
                  );
                })}
                <td className="pl-3 text-forest-500 tabular-nums">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
