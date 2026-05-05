export type ForecastResult =
  | { kind: "INSUFFICIENT_DATA" }
  | {
      kind: "FORECAST";
      centerMicros: number;
      bandPctMicros: number;
      directionalBias: "up" | "down" | "flat";
      confidence: number;
    };

export interface DayPoint {
  day: number;          // sortable epoch day or sequential index
  landed: number;       // micros / kg
}

export function forecastFromHistory(days: DayPoint[]): ForecastResult {
  if (days.length < 30) return { kind: "INSUFFICIENT_DATA" };

  const sorted = [...days].sort((a, b) => a.day - b.day);
  const last30 = sorted.slice(-30).map((d) => d.landed);
  const last7 = sorted.slice(-7).map((d) => d.landed);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const m30 = median(last30);
  const m7 = median(last7);
  const std = Math.sqrt(last30.reduce((a, b) => a + (b - m30) ** 2, 0) / last30.length);
  const dir: "up" | "down" | "flat" =
    m7 > m30 * 1.005 ? "up" : m7 < m30 * 0.995 ? "down" : "flat";
  const confidence = Math.min(1, days.length / 30);
  return {
    kind: "FORECAST",
    centerMicros: m7,
    bandPctMicros: Math.round(std),
    directionalBias: dir,
    confidence,
  };
}
