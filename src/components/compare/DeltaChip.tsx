import { cn } from "@/lib/utils/cn";

export function DeltaChip({ pct }: { pct: number }) {
  const tone =
    pct > 5 ? "bg-red-100 text-red-900"
    : pct < -5 ? "bg-lime-300 text-forest-700"
    : "bg-forest-100 text-forest-700";
  return (
    <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold", tone)}>
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}
