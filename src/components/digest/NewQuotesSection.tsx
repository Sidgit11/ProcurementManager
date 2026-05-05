import { Card } from "@/components/ui/Card";

interface QuoteRow {
  id: string;
  vendorName: string | null;
  productName: string | null;
  productNameRaw: string | null;
  unitPriceMinor: number;
  currency: string;
  unit: string;
}

export function NewQuotesSection({ items }: { items: QuoteRow[] }) {
  return (
    <Card>
      <div className="label-caps mb-3">New quotes</div>
      <ul className="divide-y divide-forest-100/50">
        {items.map((q) => (
          <li key={q.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <div className="font-medium">{q.productName ?? q.productNameRaw}</div>
              <div className="text-forest-500">{q.vendorName}</div>
            </div>
            <div className="font-medium">{q.currency} {(q.unitPriceMinor / 100).toFixed(2)}/{q.unit}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
