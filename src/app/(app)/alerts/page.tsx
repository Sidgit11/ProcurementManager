"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Alert {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

function formatAlertParams(params: Record<string, unknown>): string {
  const sku = params.sku as string | undefined;
  const threshold = params.thresholdLandedMicros as number | undefined;
  if (sku && threshold != null) {
    return `${sku} — notify below $${(threshold / 1_000_000).toFixed(2)}/kg`;
  }
  return JSON.stringify(params);
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
        params: {
          sku,
          thresholdLandedMicros: Math.round(parseFloat(threshold) * 1_000_000),
        },
      }),
    });
    if (r.ok) {
      toast.success("Alert set");
      const created = (await r.json()) as Alert;
      setList((prev) => [created, ...prev]);
      setSku("");
    } else {
      toast.error("Failed to create alert");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <div className="label-caps">ALERTS</div>
        <h1 className="font-display text-3xl mt-1">Get pinged when something matters</h1>
        <p className="mt-2 text-sm text-forest-500">
          Alerts watch every captured quote in real time. Set a threshold for any SKU — when a vendor crosses it,
          you get a notification. Useful for SKUs where the market moves fast and you can&apos;t watch the inbox all day.
        </p>
      </div>

      {/* New alert form */}
      <Card>
        <div className="label-caps mb-3">SET A NEW ALERT</div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">SKU</label>
            <input
              className="w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
              placeholder="e.g. CUMIN-99PURE"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <p className="mt-1 text-xs text-forest-400">Use the same SKU code you see on the Compare page.</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notify when landed cost drops below (USD/kg)</label>
            <input
              className="w-32 rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={add} disabled={!sku || !threshold}>
            Set alert
          </Button>
        </div>
      </Card>

      {/* Existing alerts */}
      <div>
        <div className="label-caps mb-2">ACTIVE ALERTS</div>
        {list.length === 0 ? (
          <p className="text-sm text-forest-500 italic">
            No alerts yet. Setting one is fast — pick a SKU and a price threshold above.
          </p>
        ) : (
          <div className="grid gap-2">
            {list.map((a) => (
              <Card key={a.id}>
                <div className="text-sm">{formatAlertParams(a.params)}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
