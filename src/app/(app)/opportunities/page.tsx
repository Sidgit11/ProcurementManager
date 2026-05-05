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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page header */}
      <div>
        <div className="label-caps">BUY OPPORTUNITIES</div>
        <h1 className="font-display text-3xl mt-1">Quotes worth acting on now</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          When a vendor&apos;s quote drops below your trailing 30-day average — and that vendor has a reliability
          tier you trust — it lands here with the math behind it. Each one expires when the vendor&apos;s
          validity window closes.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-forest-500 italic">
          No high-conviction opportunities today. The scanner runs automatically every 30 minutes — fresh quotes
          are evaluated as they come in.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const strength = Math.min(100, Math.round((r.score ?? 0) / 10_000));
            return (
              <Card key={r.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="label-caps">Buy opportunity</div>
                    <div className="font-display text-lg">{r.productName ?? "Unknown product"}</div>
                    <div className="text-sm text-forest-500">{r.vendorName ?? "Unknown vendor"}</div>
                  </div>
                  <Pill label={`STRENGTH ${strength}`} />
                </div>
                {r.reasoning && <p className="mt-3 text-sm">{r.reasoning}</p>}
                {r.expires && (
                  <p className="mt-2 text-xs text-forest-400">
                    Expires {r.expires.toISOString().slice(0, 10)}
                  </p>
                )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
