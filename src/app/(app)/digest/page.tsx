import { currentOrg } from "@/lib/auth/current";
import { getDigestSummary } from "@/lib/db/queries/digest";
import { OutlierCard } from "@/components/digest/OutlierCard";
import { NewQuotesSection } from "@/components/digest/NewQuotesSection";

interface OutlierRow {
  id: string;
  vendor_name: string;
  product_name: string | null;
  landed: number;
  avg_landed: number;
}

interface QuoteRow {
  id: string;
  vendorName: string | null;
  productName: string | null;
  productNameRaw: string | null;
  unitPriceMinor: number;
  currency: string;
  unit: string;
}

export default async function DigestPage() {
  const o = await currentOrg();
  const { newQuotes, outliers } = await getDigestSummary(o.id, 7);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="label-caps">Today</div>
        <h1 className="font-display text-3xl">
          {newQuotes.length} new quotes captured. {outliers.length} outliers flagged.
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(outliers as unknown as OutlierRow[]).map((o) => (
          <OutlierCard
            key={o.id}
            vendorName={o.vendor_name}
            productName={o.product_name ?? "—"}
            landed={Number(o.landed)}
            avg={Number(o.avg_landed)}
          />
        ))}
      </div>
      <NewQuotesSection items={newQuotes as unknown as QuoteRow[]} />
    </div>
  );
}
