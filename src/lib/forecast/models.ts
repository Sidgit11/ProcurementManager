import type { ForecastResult } from "./model";

export type { ForecastResult };
export type DayPoint = { day: number; landed: number };

export type ModelId = "rolling_median" | "ema" | "seasonal_naive" | "linear_trend";

export interface ModelConfig {
  modelId: ModelId;
  lookbackDays?: number;
  recentDays?: number;
  alpha?: number;
  seasonalityDays?: number;
}

export const MODEL_CATALOG: Record<
  ModelId,
  {
    id: ModelId;
    name: string;
    whenToUse: string;
    inputs: Array<{
      key: keyof ModelConfig;
      label: string;
      helper: string;
      min?: number;
      max?: number;
      step?: number;
      default: number;
    }>;
  }
> = {
  rolling_median: {
    id: "rolling_median",
    name: "Rolling median",
    whenToUse:
      "Stable markets where you trust the recent trend over noise. Best for spices, pulses, and other commodities with low week-to-week volatility.",
    inputs: [
      {
        key: "lookbackDays",
        label: "Lookback window (days)",
        helper: "How far back the baseline median is computed.",
        min: 14,
        max: 180,
        step: 1,
        default: 30,
      },
      {
        key: "recentDays",
        label: "Recent window (days)",
        helper: "Compared against the lookback to detect trend.",
        min: 3,
        max: 30,
        step: 1,
        default: 7,
      },
    ],
  },
  ema: {
    id: "ema",
    name: "Exponential moving average",
    whenToUse:
      "Trending markets where recent quotes should weigh more than older ones. Good for SKUs in active price drift.",
    inputs: [
      {
        key: "alpha",
        label: "Smoothing factor (α)",
        helper:
          "Higher = more weight on recent quotes (0.05 calm, 0.5 reactive, 0.95 nearly the latest value).",
        min: 0.05,
        max: 0.95,
        step: 0.05,
        default: 0.3,
      },
    ],
  },
  seasonal_naive: {
    id: "seasonal_naive",
    name: "Seasonal naive",
    whenToUse:
      "When prices repeat in cycles — monthly festivals, harvest seasons, quarterly contract renewals. You set the cycle length.",
    inputs: [
      {
        key: "seasonalityDays",
        label: "Cycle length (days)",
        helper:
          "Common values: 7 (weekly), 30 (monthly), 90 (quarterly), 365 (annual).",
        min: 7,
        max: 365,
        step: 1,
        default: 30,
      },
    ],
  },
  linear_trend: {
    id: "linear_trend",
    name: "Linear trend",
    whenToUse:
      "Markets with a clear directional drift — currency-driven price movement, structural shifts. Less useful in ranging markets.",
    inputs: [
      {
        key: "lookbackDays",
        label: "Lookback window (days)",
        helper: "How many recent days the trend line is fit through.",
        min: 14,
        max: 180,
        step: 1,
        default: 60,
      },
    ],
  },
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function runModel(days: DayPoint[], cfg: ModelConfig): ForecastResult {
  if (days.length < 14) return { kind: "INSUFFICIENT_DATA" };
  const sorted = [...days].sort((a, b) => a.day - b.day);

  if (cfg.modelId === "rolling_median") {
    const lb = cfg.lookbackDays ?? 30;
    const rc = cfg.recentDays ?? 7;
    if (sorted.length < lb) return { kind: "INSUFFICIENT_DATA" };
    const lookback = sorted.slice(-lb).map((d) => d.landed);
    const recent = sorted.slice(-rc).map((d) => d.landed);
    const mLb = median(lookback);
    const mRc = median(recent);
    const std = Math.sqrt(
      lookback.reduce((a, b) => a + (b - mLb) ** 2, 0) / lookback.length
    );
    const dir: "up" | "down" | "flat" =
      mRc > mLb * 1.005 ? "up" : mRc < mLb * 0.995 ? "down" : "flat";
    return {
      kind: "FORECAST",
      centerMicros: mRc,
      bandPctMicros: Math.round(std),
      directionalBias: dir,
      confidence: Math.min(1, sorted.length / 30),
    };
  }

  if (cfg.modelId === "ema") {
    const a = cfg.alpha ?? 0.3;
    let ema = sorted[0].landed;
    for (let i = 1; i < sorted.length; i++)
      ema = a * sorted[i].landed + (1 - a) * ema;
    let emaPast = sorted[0].landed;
    const cutoff = Math.max(0, sorted.length - 14);
    for (let i = 1; i <= cutoff; i++)
      emaPast = a * sorted[i].landed + (1 - a) * emaPast;
    const std = Math.sqrt(
      sorted.reduce((acc, p) => acc + (p.landed - ema) ** 2, 0) / sorted.length
    );
    const dir: "up" | "down" | "flat" =
      ema > emaPast * 1.005 ? "up" : ema < emaPast * 0.995 ? "down" : "flat";
    return {
      kind: "FORECAST",
      centerMicros: Math.round(ema),
      bandPctMicros: Math.round(std),
      directionalBias: dir,
      confidence: Math.min(1, sorted.length / 30),
    };
  }

  if (cfg.modelId === "seasonal_naive") {
    const s = cfg.seasonalityDays ?? 30;
    if (sorted.length <= s) return { kind: "INSUFFICIENT_DATA" };
    const last = sorted[sorted.length - 1].landed;
    const past = sorted[sorted.length - 1 - s].landed;
    const std = Math.sqrt(
      sorted.reduce((acc, p) => acc + (p.landed - last) ** 2, 0) / sorted.length
    );
    const dir: "up" | "down" | "flat" =
      last > past * 1.005 ? "up" : last < past * 0.995 ? "down" : "flat";
    return {
      kind: "FORECAST",
      centerMicros: past,
      bandPctMicros: Math.round(std),
      directionalBias: dir,
      confidence: Math.min(1, sorted.length / (s * 2)),
    };
  }

  if (cfg.modelId === "linear_trend") {
    const lb = cfg.lookbackDays ?? 60;
    const slice = sorted.slice(-lb);
    if (slice.length < 14) return { kind: "INSUFFICIENT_DATA" };
    const n = slice.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += slice[i].landed;
      sumXY += i * slice[i].landed;
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const projected = intercept + slope * (n + 13); // 14-day-ahead projection
    const residuals = slice.map((p, i) => p.landed - (intercept + slope * i));
    const std = Math.sqrt(
      residuals.reduce((a, b) => a + b * b, 0) / n
    );
    const dir: "up" | "down" | "flat" =
      slope > 100 ? "up" : slope < -100 ? "down" : "flat"; // 100 micros/day threshold
    return {
      kind: "FORECAST",
      centerMicros: Math.max(0, Math.round(projected)),
      bandPctMicros: Math.round(std),
      directionalBias: dir,
      confidence: Math.min(1, slice.length / 60),
    };
  }

  return { kind: "INSUFFICIENT_DATA" };
}
