import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ChartLine, Lightning, Pulse } from "@phosphor-icons/react/dist/ssr";

const SECTIONS = [
  {
    href: "/insights/forecasts",
    label: "Price forecasts",
    description: "Rolling-median forecast for the next 14 days, per SKU. Trend, confidence, best buying window.",
    Icon: ChartLine,
  },
  {
    href: "/compare",
    label: "Compare quotes",
    description: "Side-by-side normalized landed cost across vendors. Best price, outliers, deltas vs trailing average.",
    Icon: Pulse,
  },
  {
    href: "/opportunities",
    label: "Buy opportunities",
    description: "High-conviction buys: price gap × vendor reliability × validity urgency, with reasoning.",
    Icon: Lightning,
  },
];

export default function InsightsHub() {
  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Insights</div>
        <h1 className="font-display text-3xl">Where the market is moving</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Trends, forecasts, and buy opportunities derived from every quote you&apos;ve captured. Built for weekly and monthly reviews — not the daily inbox.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {SECTIONS.map(({ href, label, description, Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-white h-full">
              <Icon size={22} className="text-forest-700 mb-2" />
              <div className="font-medium">{label}</div>
              <div className="mt-1 text-sm text-forest-500">{description}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
