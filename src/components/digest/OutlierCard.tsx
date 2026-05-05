import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

interface OutlierCardProps {
  vendorName: string;
  productName: string;
  landed: number;
  avg: number;
}

export function OutlierCard({ vendorName, productName, landed, avg }: OutlierCardProps) {
  const deltaPct = ((landed - avg) / avg) * 100;
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="label-caps">Outlier</div>
          <div className="font-display text-lg">{vendorName}</div>
          <div className="text-sm text-forest-500">{productName}</div>
        </div>
        <Pill label="OUTLIER" />
      </div>
      <div className="mt-3 text-sm">
        Landed <strong>${(landed / 1_000_000).toFixed(2)}/kg</strong> · {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}% vs trailing avg ${(avg / 1_000_000).toFixed(2)}.
      </div>
    </Card>
  );
}
