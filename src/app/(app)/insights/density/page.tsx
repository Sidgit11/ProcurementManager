import { Card } from "@/components/ui/Card";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DensityHeatmap } from "@/components/insights/DensityHeatmap";

export default function DensityPage() {
  return (
    <div className="space-y-4 max-w-6xl">
      <Breadcrumbs trail={[{ label: "Insights", href: "/insights" }, { label: "Offer density" }]} />
      <div>
        <div className="label-caps">Offer density</div>
        <h1 className="font-display text-3xl">Where vendors are pitching — and where they aren&apos;t</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Each cell is a week. The brighter the cell, the more quotes you received for that SKU that week. Bright streaks signal oversupply (vendors pushing). Dark patches suggest tight markets — a good time to send RFQs to refresh your view.
        </p>
      </div>
      <Card>
        <DensityHeatmap />
      </Card>
    </div>
  );
}
