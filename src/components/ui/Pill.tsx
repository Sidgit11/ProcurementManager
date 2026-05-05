import { cn } from "@/lib/utils/cn";

const tone: Record<string, string> = {
  RELIABLE:   "bg-lime-300 text-forest-700",
  AGGRESSIVE: "bg-amber-100 text-amber-900",
  SLOW:       "bg-forest-100 text-forest-700",
  OUTLIER:    "bg-red-100 text-red-900",
};

export function Pill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider",
        tone[label] ?? "bg-forest-100 text-forest-700",
      )}
    >
      {label}
    </span>
  );
}
