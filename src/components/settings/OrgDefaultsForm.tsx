"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

const CURRENCIES = ["USD", "EUR", "BRL", "INR", "VND", "IDR", "TRY"];
const PORTS = [
  { code: "BR-NVT", name: "Navegantes, Brazil" },
  { code: "BR-SSZ", name: "Santos, Brazil" },
  { code: "BR-PNG", name: "Paranaguá, Brazil" },
  { code: "IN-NSA", name: "Nhava Sheva, India" },
  { code: "IN-MAA", name: "Chennai, India" },
  { code: "AE-JEA", name: "Jebel Ali, UAE" },
  { code: "TR-IZM", name: "Izmir, Türkiye" },
  { code: "VN-HPH", name: "Haiphong, Vietnam" },
  { code: "ID-TPP", name: "Tanjung Priok, Indonesia" },
];

interface Defaults {
  homeCurrency: string;
  homePort: string;
  outlierThresholdPct: number;
  leadTimeToleranceDays: number;
}

export function OrgDefaultsForm({ initial }: { initial: Defaults }) {
  const [d, setD] = useState<Defaults>(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/settings/defaults", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(d),
      });
      if (r.ok) toast.success("Defaults saved");
      else toast.error("Save failed");
    } finally { setSaving(false); }
  }

  return (
    <Card className="space-y-4">
      <label className="block">
        <div className="text-xs label-caps mb-1">Home port</div>
        <select
          value={d.homePort}
          onChange={(e) => setD((p) => ({ ...p, homePort: e.target.value }))}
          className="w-full rounded-lg border border-forest-100/60 bg-white px-3 py-2 text-sm"
        >
          <option value="">— Select —</option>
          {PORTS.map((p) => (
            <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
          ))}
        </select>
        <p className="text-[11px] text-forest-500 mt-1">All landed cost calculations and freight assumptions default to this port.</p>
      </label>

      <label className="block">
        <div className="text-xs label-caps mb-1">Home currency</div>
        <select
          value={d.homeCurrency}
          onChange={(e) => setD((p) => ({ ...p, homeCurrency: e.target.value }))}
          className="w-full rounded-lg border border-forest-100/60 bg-white px-3 py-2 text-sm"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="text-[11px] text-forest-500 mt-1">Vendor quotes in other currencies are normalized to this when displayed.</p>
      </label>

      <label className="block">
        <div className="text-xs label-caps mb-1">Outlier threshold (% above 30-day median)</div>
        <div className="flex items-center gap-3">
          <input
            type="range" min={5} max={25} step={1}
            value={d.outlierThresholdPct}
            onChange={(e) => setD((p) => ({ ...p, outlierThresholdPct: Number(e.target.value) }))}
            className="flex-1 accent-forest-700"
          />
          <span className="font-medium tabular-nums w-10 text-right">{d.outlierThresholdPct}%</span>
        </div>
        <p className="text-[11px] text-forest-500 mt-1">Quotes exceeding this much above the trailing 30-day median get flagged in your digest.</p>
      </label>

      <label className="block">
        <div className="text-xs label-caps mb-1">Lead time tolerance (days)</div>
        <input
          type="number" min={1} max={120}
          value={d.leadTimeToleranceDays}
          onChange={(e) => setD((p) => ({ ...p, leadTimeToleranceDays: Number(e.target.value) }))}
          className="w-32 rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
        />
        <p className="text-[11px] text-forest-500 mt-1">Vendors quoting beyond this lead time are de-prioritized in buy opportunity scoring.</p>
      </label>

      <div className="flex justify-end pt-2">
        <Button variant="secondary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save defaults"}</Button>
      </div>
    </Card>
  );
}
