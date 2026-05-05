import { currentOrg, currentUser } from "@/lib/auth/current";
import { getDigestSummary } from "@/lib/db/queries/digest";
import { OutlierCard } from "@/components/digest/OutlierCard";
import { NewQuotesSection } from "@/components/digest/NewQuotesSection";
import { db } from "@/lib/db/client";
import { agentRun } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

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
  const [o, u] = await Promise.all([currentOrg(), currentUser()]);
  const { newQuotes, outliers } = await getDigestSummary(o.id, 7);

  // Pull latest daily_summary agent run for the hero paragraph
  const [latestSummaryRun] = await db
    .select()
    .from(agentRun)
    .where(and(eq(agentRun.orgId, o.id), eq(agentRun.agentName, "daily_summary")))
    .orderBy(desc(agentRun.createdAt))
    .limit(1);

  const summaryText: string | null =
    latestSummaryRun?.proposedActions &&
    typeof latestSummaryRun.proposedActions === "object" &&
    !Array.isArray(latestSummaryRun.proposedActions)
      ? ((latestSummaryRun.proposedActions as Record<string, unknown>).summary as string | undefined) ?? null
      : null;

  const firstName = u.name.split(" ")[0];

  const fallbackSummary = `${newQuotes.length} new ${newQuotes.length === 1 ? "quote" : "quotes"} captured in the last 7 days. ${outliers.length} ${outliers.length === 1 ? "outlier" : "outliers"} flagged above the trailing 30-day average.`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Morning brief */}
      <div>
        <div className="label-caps">TODAY</div>
        <h1 className="font-display text-3xl mt-1">Good morning, {firstName}.</h1>
        <p className="mt-2 text-forest-600 max-w-2xl">
          {summaryText ?? fallbackSummary}
        </p>
      </div>

      {/* Outliers section */}
      <div>
        <div className="label-caps">OUTLIERS WORTH A LOOK</div>
        <p className="text-sm text-forest-500 mt-0.5 mb-4">
          Vendors quoting more than 10% above the trailing 30-day average for the SKU.
        </p>
        {(outliers as unknown as OutlierRow[]).length === 0 ? (
          <p className="text-sm text-forest-500 italic">
            No outliers this week. Vendor pricing is in line with your trailing average — typical of healthy market weeks.
          </p>
        ) : (
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
        )}
      </div>

      {/* Recent quotes section */}
      <div>
        <div className="label-caps">RECENT QUOTES</div>
        <p className="text-sm text-forest-500 mt-0.5 mb-4">
          What landed in the last 7 days.
        </p>
        {newQuotes.length === 0 ? (
          <p className="text-sm text-forest-500 italic">
            No new quotes today. Try uploading a chat export or sending an RFQ to start capturing.
          </p>
        ) : (
          <NewQuotesSection items={newQuotes as unknown as QuoteRow[]} />
        )}
      </div>
    </div>
  );
}
