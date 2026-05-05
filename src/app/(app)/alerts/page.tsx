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
      toast.success("Alert created");
      const created = (await r.json()) as Alert;
      setList((prev) => [created, ...prev]);
      setSku("");
    } else {
      toast.error("Failed to create alert");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Alerts</h1>
      <Card>
        <div className="label-caps mb-2">New: notify when SKU drops below</div>
        <div className="flex gap-2">
          <input
            className="rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
            placeholder="SKU (e.g. CUMIN-99PURE)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="w-32 rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <Button variant="secondary" onClick={add} disabled={!sku || !threshold}>Create</Button>
        </div>
      </Card>
      <div className="grid gap-2">
        {list.length === 0 && <p className="text-sm text-forest-500">No alerts yet. Create your first one.</p>}
        {list.map((a) => (
          <Card key={a.id}>
            <div className="text-sm">{a.kind} · {JSON.stringify(a.params)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
