"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { MODEL_CATALOG, type ModelId } from "@/lib/forecast/models";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

interface SkuOption {
  sku: string;
  name: string;
  n: number;
}

interface ChartPoint {
  date: string;
  landed: number;
}

interface ForecastOk {
  kind: "FORECAST";
  centerMicros: number;
  bandPctMicros: number;
  directionalBias: "up" | "down" | "flat";
  confidence: number;
}

interface ForecastInsuf {
  kind: "INSUFFICIENT_DATA";
}

type ForecastResult = ForecastOk | ForecastInsuf;

interface PreviewResponse {
  history: { day: number; landed: number }[];
  result: ForecastResult;
}

const BIAS_LABEL: Record<string, string> = {
  up: "UP",
  down: "DOWN",
  flat: "FLAT",
};

function defaultsFor(id: ModelId): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of MODEL_CATALOG[id].inputs) out[i.key as string] = i.default;
  return out;
}

export default function ForecastWorkshop() {
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [sku, setSku] = useState<string>("");
  const [modelId, setModelId] = useState<ModelId>("rolling_median");
  // Per-model param overrides — keyed by modelId so switching models never bleeds overrides
  const [overrides, setOverrides] = useState<Partial<Record<ModelId, Record<string, number>>>>({});
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState(false);

  // Effective params = defaults merged with any user overrides for the active model
  const params = useMemo(
    () => ({ ...defaultsFor(modelId), ...(overrides[modelId] ?? {}) }),
    [modelId, overrides],
  );

  function handleModelChange(id: ModelId) {
    setModelId(id);
    setPreview(null);
  }

  function handleParamChange(key: string, value: number) {
    setOverrides((prev) => ({
      ...prev,
      [modelId]: { ...(prev[modelId] ?? defaultsFor(modelId)), [key]: value },
    }));
  }

  // Load available SKUs once
  useEffect(() => {
    fetch("/api/skus")
      .then((r) => r.json())
      .then((data: SkuOption[]) => {
        setSkus(data);
        if (data[0] && !sku) setSku(data[0].sku);
      })
      .catch(() => toast.error("Failed to load SKUs"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPreview() {
    if (!sku) return;
    setBusy(true);
    try {
      const r = await fetch("/api/forecast/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, modelId, params }),
      });
      if (!r.ok) {
        toast.error("Preview failed");
        return;
      }
      const data = (await r.json()) as PreviewResponse;
      setPreview(data);
    } finally {
      setBusy(false);
    }
  }

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!preview) return [];
    return preview.history.map((d) => ({
      date: new Date(d.day * 1000).toISOString().slice(5, 10),
      landed: d.landed / 1_000_000,
    }));
  }, [preview]);

  const forecastUsdPerKg =
    preview?.result.kind === "FORECAST"
      ? preview.result.centerMicros / 1_000_000
      : null;
  const bandUsdPerKg =
    preview?.result.kind === "FORECAST"
      ? preview.result.bandPctMicros / 1_000_000
      : null;

  const model = MODEL_CATALOG[modelId];

  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Forecast workshop</div>
        <h1 className="font-display text-3xl">Try a model on your data</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Different methodologies fit different commodities. Pick a model, tweak
          the inputs, and see how it would have predicted prices on your captured
          history. Save the one that fits as the default for this SKU.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left panel — controls */}
        <div className="space-y-3">
          {/* SKU selector */}
          <Card>
            <div className="label-caps mb-2">SKU</div>
            <select
              className="w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm bg-white"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setPreview(null);
              }}
            >
              {skus.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.name} ({s.n} quotes)
                </option>
              ))}
            </select>
          </Card>

          {/* Model picker */}
          <Card>
            <div className="label-caps mb-2">Model</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(MODEL_CATALOG).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModelChange(m.id)}
                  className={
                    "rounded-lg px-3 py-2 text-xs font-medium text-left transition " +
                    (modelId === m.id
                      ? "bg-forest-700 text-white"
                      : "bg-white hover:bg-forest-100/40 border border-forest-100/60")
                  }
                >
                  {m.name}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-forest-500 leading-relaxed">
              {model.whenToUse}
            </div>
          </Card>

          {/* Parameter controls */}
          <Card>
            <div className="label-caps mb-2">Inputs</div>
            <div className="space-y-4">
              {model.inputs.map((i) => (
                <label key={String(i.key)} className="block">
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="text-sm font-medium">{i.label}</div>
                    <div className="text-xs text-forest-500 tabular-nums font-mono">
                      {params[i.key as string] !== undefined
                        ? params[i.key as string].toString()
                        : i.default.toString()}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={i.min}
                    max={i.max}
                    step={i.step}
                    value={params[i.key as string] ?? i.default}
                    onChange={(e) =>
                      handleParamChange(i.key as string, parseFloat(e.target.value))
                    }
                    className="w-full accent-forest-700"
                  />
                  <div className="text-xs text-forest-500 mt-0.5 leading-snug">
                    {i.helper}
                  </div>
                </label>
              ))}
            </div>
            <Button
              variant="secondary"
              className="mt-4 w-full justify-center"
              onClick={runPreview}
              disabled={busy || !sku}
            >
              {busy ? "Running…" : "Run preview"}
            </Button>
          </Card>
        </div>

        {/* Right panel — chart + results */}
        <Card className="min-h-[420px]">
          <div className="flex items-baseline justify-between mb-3">
            <div className="label-caps">Preview</div>
            {preview?.result.kind === "FORECAST" && (
              <div className="flex items-center gap-2">
                <Pill label={BIAS_LABEL[preview.result.directionalBias] ?? preview.result.directionalBias.toUpperCase()} />
                <div className="text-xs text-forest-500">
                  Confidence{" "}
                  {(preview.result.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>

          {!preview && (
            <div className="text-sm text-forest-500 mt-16 text-center px-4">
              Pick a SKU and run a preview to see how this model performs on
              your data.
            </div>
          )}

          {preview?.result.kind === "INSUFFICIENT_DATA" && (
            <div className="text-sm text-forest-500 mt-12 text-center px-4">
              <div className="font-medium text-forest-700 text-base">
                Not enough data to forecast.
              </div>
              <div className="mt-1">
                {model.name} needs more daily observations than this SKU has
                captured. Try a different SKU or shorten the lookback window.
              </div>
            </div>
          )}

          {preview?.result.kind === "FORECAST" && (
            <>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 16, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#C5D6CB" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#2A5640" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#2A5640" }}
                      tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    />
                    <Tooltip
                      formatter={(v) => [`$${Number(v).toFixed(2)}/kg`, "Landed cost"]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #C5D6CB",
                        fontSize: 12,
                      }}
                    />
                    {forecastUsdPerKg != null && bandUsdPerKg != null && (
                      <ReferenceArea
                        y1={forecastUsdPerKg - bandUsdPerKg}
                        y2={forecastUsdPerKg + bandUsdPerKg}
                        fill="#D4F65E"
                        fillOpacity={0.18}
                        ifOverflow="extendDomain"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="landed"
                      stroke="#1A3326"
                      strokeWidth={2}
                      dot={false}
                    />
                    {forecastUsdPerKg != null && chartData.length > 0 && (
                      <ReferenceDot
                        x={chartData[chartData.length - 1].date}
                        y={forecastUsdPerKg}
                        r={5}
                        fill="#D4F65E"
                        stroke="#1A3326"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center border-t border-forest-100/40 pt-4">
                <div>
                  <div className="label-caps">Forecast (14d)</div>
                  <div className="font-display text-xl mt-0.5">
                    ${forecastUsdPerKg!.toFixed(2)}/kg
                  </div>
                </div>
                <div>
                  <div className="label-caps">Volatility band</div>
                  <div className="font-display text-xl mt-0.5">
                    ±${bandUsdPerKg!.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="label-caps">Direction</div>
                  <div className="font-display text-xl mt-0.5 uppercase">
                    {preview.result.directionalBias}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
