"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";

interface Alert { id: string; kind: string; params: Record<string, unknown>; enabled: boolean; }
interface Row {
  id: string; kind: string; sku: string; thresholdUsdPerKg: number | null; enabled: boolean;
}

export default function Alerts() {
  const [sku, setSku] = useState("");
  const [threshold, setThreshold] = useState("3.50");
  const [list, setList] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then(setList).catch(() => toast.error("Failed to load alerts"));
  }, []);

  async function add() {
    const r = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "price_below",
        params: { sku, thresholdLandedMicros: Math.round(parseFloat(threshold) * 1_000_000) },
      }),
    });
    if (r.ok) {
      toast.success("Alert created");
      const created = (await r.json()) as Alert;
      setList((prev) => [created, ...prev]);
      setSku("");
    } else {
      toast.error("Failed to create alert");
    }
  }

  const rows: Row[] = list.map((a) => {
    const p = a.params as { sku?: string; thresholdLandedMicros?: number };
    return {
      id: a.id, kind: a.kind, sku: p.sku ?? "—",
      thresholdUsdPerKg: p.thresholdLandedMicros != null ? p.thresholdLandedMicros / 1_000_000 : null,
      enabled: a.enabled,
    };
  });

  const columns: Column<Row>[] = [
    { key: "sku", header: "SKU", accessor: (r) => r.sku, filterable: true },
    {
      key: "kind", header: "Trigger", accessor: (r) => r.kind, filterable: true,
      render: (r) => <span className="text-forest-700">{r.kind === "price_below" ? "Drops below" : r.kind === "price_above" ? "Rises above" : r.kind}</span>,
    },
    {
      key: "thresholdUsdPerKg", header: "Threshold (USD/kg landed)", accessor: (r) => r.thresholdUsdPerKg, align: "right",
      render: (r) => r.thresholdUsdPerKg != null ? `$${r.thresholdUsdPerKg.toFixed(2)}` : "—",
    },
    {
      key: "enabled", header: "Status", accessor: (r) => r.enabled ? "Active" : "Paused",
      render: (r) => <Pill label={r.enabled ? "ACTIVE" : "PAUSED"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Alerts</div>
        <h1 className="font-display text-3xl">Get pinged when something matters</h1>
        <p className="mt-1 text-sm text-forest-500 max-w-2xl">
          Alerts watch every captured quote in real time. Set a threshold for any SKU — when a vendor crosses it, you get a notification.
        </p>
      </div>
      <Card>
        <div className="label-caps mb-2">New alert: notify when an SKU drops below a price</div>
        <div className="flex gap-2 flex-wrap">
          <input
            className="rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
            placeholder="SKU (e.g. CUMIN-SEEDS)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="w-32 rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="3.50"
          />
          <Button variant="secondary" onClick={add} disabled={!sku || !threshold}>Set alert</Button>
        </div>
        <p className="text-xs text-forest-500 mt-2">Use the same SKU code you see on the Compare page. Threshold is in USD per kg landed.</p>
      </Card>
      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={["sku"]}
        searchPlaceholder="Search alerts by SKU"
        emptyState="No alerts yet. Setting one is fast — pick a SKU and a price threshold above."
      />
    </div>
  );
}
