"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";

interface HistoryPoint { day: number | string; landed: number | string; n: number | string }

export function PriceHistoryChart({ sku }: { sku: string }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/compare/${sku}/history?days=${days}`);
        const d = await r.json();
        if (!cancelled) setHistory(d.history ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sku, days]);

  const chartData = history.map((h) => ({
    date: new Date(Number(h.day) * 1000).toISOString().slice(5, 10),
    price: Number(h.landed) / 1_000_000,
    n: Number(h.n),
  }));

  const prices = chartData.map((d) => d.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const trend: "up" | "down" | "flat" =
    chartData.length >= 4
      ? chartData[chartData.length - 1].price > chartData[0].price * 1.01 ? "up"
        : chartData[chartData.length - 1].price < chartData[0].price * 0.99 ? "down"
        : "flat"
      : "flat";

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="label-caps">Trend ({days}-day landed cost across all vendors)</div>
          <div className="text-xs text-forest-500 mt-0.5">
            {chartData.length === 0
              ? "Not enough captured quotes in this window."
              : `Range $${min.toFixed(2)}–$${max.toFixed(2)}/kg · trending ${trend}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={"px-2.5 py-1 text-xs rounded " + (days === d ? "bg-forest-700 text-white" : "text-forest-500 hover:bg-forest-100/50")}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="h-[180px]">
        {loading && <div className="text-xs text-forest-500 text-center pt-12">Loading…</div>}
        {!loading && chartData.length === 0 && <div className="text-xs text-forest-500 text-center pt-12">No quote history in this window.</div>}
        {!loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C5D6CB" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#2A5640" }} />
              <YAxis tick={{ fontSize: 10, fill: "#2A5640" }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(2)}/kg`, "Landed"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #C5D6CB", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="price" stroke="#1A3326" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
