import { db } from "@/lib/db/client";
import { buyOpportunity, vendor, product } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import Link from "next/link";

export default async function Opportunities() {
  const o = await currentOrg();
  const rows = await db
    .select({
      id: buyOpportunity.id,
      score: buyOpportunity.score,
      status: buyOpportunity.status,
      reasoning: buyOpportunity.reasoningText,
      expires: buyOpportunity.expiresAt,
      vendorName: vendor.name,
      productName: product.name,
    })
    .from(buyOpportunity)
    .leftJoin(vendor, eq(buyOpportunity.vendorId, vendor.id))
    .leftJoin(product, eq(buyOpportunity.productId, product.id))
    .where(and(
      eq(buyOpportunity.orgId, o.id),
    ))
    .orderBy(desc(buyOpportunity.score))
    .limit(50);

  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Buy opportunities</div>
        <h1 className="font-display text-3xl">Quotes worth acting on now</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          When a vendor&apos;s quote drops below your trailing 30-day average — and that vendor has a reliability tier you trust — it lands here with the math behind it. Click any opportunity to negotiate or generate a PO.
        </p>
      </div>
      {rows.length === 0 && (
        <p className="text-sm text-forest-500">No high-conviction opportunities today.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Link key={r.id} href={`/opportunities/${r.id}`}>
            <Card className="hover:bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="label-caps">Opportunity</div>
                  <div className="font-display text-lg truncate">{r.productName ?? "Unknown product"}</div>
                  <div className="text-sm text-forest-500 truncate">{r.vendorName ?? "Unknown vendor"}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Pill label={`STRENGTH ${Math.min(100, Math.round(r.score / 10_000))}`} />
                  <Pill label={(r.status ?? "open").replace("_", " ").toUpperCase()} />
                </div>
              </div>
              {r.reasoning && <p className="mt-3 text-sm line-clamp-3">{r.reasoning}</p>}
              {r.expires && <div className="mt-2 text-[11px] text-forest-500">Expires {new Date(r.expires as unknown as string).toLocaleDateString()}</div>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
