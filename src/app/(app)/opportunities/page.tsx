import { db } from "@/lib/db/client";
import { buyOpportunity, vendor, product } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

export default async function Opportunities() {
  const o = await currentOrg();
  const rows = await db
    .select({
      id: buyOpportunity.id,
      score: buyOpportunity.score,
      reasoning: buyOpportunity.reasoningText,
      expires: buyOpportunity.expiresAt,
      vendorName: vendor.name,
      productName: product.name,
      quoteId: buyOpportunity.quoteId,
    })
    .from(buyOpportunity)
    .leftJoin(vendor, eq(buyOpportunity.vendorId, vendor.id))
    .leftJoin(product, eq(buyOpportunity.productId, product.id))
    .where(and(eq(buyOpportunity.orgId, o.id), eq(buyOpportunity.status, "open")))
    .orderBy(desc(buyOpportunity.score))
    .limit(20);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Buy opportunities</h1>
      {rows.length === 0 && (
        <p className="text-sm text-forest-500">
          No high-conviction opportunities right now. Run the buy-opportunity scan to surface fresh candidates.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="label-caps">Opportunity</div>
                <div className="font-display text-lg">{r.productName ?? "Unknown product"}</div>
                <div className="text-sm text-forest-500">{r.vendorName ?? "Unknown vendor"}</div>
              </div>
              <Pill label={`SCORE ${(r.score / 10_000).toFixed(0)}`} />
            </div>
            {r.reasoning && <p className="mt-3 text-sm">{r.reasoning}</p>}
            <div className="mt-3 flex gap-2">
              <form action={`/api/opportunities/${r.id}/buy`} method="post">
                <Button variant="secondary" type="submit">Buy</Button>
              </form>
              <form action={`/api/opportunities/${r.id}/snooze`} method="post">
                <Button variant="ghost" type="submit">Snooze</Button>
              </form>
              <form action={`/api/opportunities/${r.id}/dismiss`} method="post">
                <Button variant="ghost" type="submit">Dismiss</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
