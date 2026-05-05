import { db } from "@/lib/db/client";
import { vendor, quote } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function VendorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [v] = await db.select().from(vendor).where(eq(vendor.id, id));
  if (!v) return <div className="text-sm text-forest-500">Vendor not found.</div>;

  const stats = await db.execute(sql`
    SELECT COUNT(*)::int AS quotes_count,
           COUNT(DISTINCT product_id)::int AS products_count,
           MAX(captured_at) AS last_activity
    FROM quote
    WHERE vendor_id = ${id}
  `);
  const s = stats.rows[0] as { quotes_count: number; products_count: number; last_activity: string | null };

  const quotes = await db.select().from(quote).where(eq(quote.vendorId, id)).orderBy(desc(quote.capturedAt)).limit(20);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Vendor header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl">{v.name}</h1>
          {v.scoreTier && <Pill label={v.scoreTier} />}
        </div>
        <div className="text-sm text-forest-500 mt-1">
          {v.country ?? "—"} · last activity {s.last_activity?.slice(0, 10) ?? "—"}
        </div>
        <p className="mt-2 text-sm text-forest-400">
          This profile updates automatically every time {v.name} replies. Edit notes manually below.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="label-caps">Total quotes</div>
          <div className="text-2xl font-display">{Number(s.quotes_count)}</div>
        </Card>
        <Card>
          <div className="label-caps">Products supplied</div>
          <div className="text-2xl font-display">{Number(s.products_count)}</div>
        </Card>
        <Card>
          <div className="label-caps">Last activity</div>
          <div className="text-2xl font-display">{s.last_activity?.slice(0, 10) ?? "—"}</div>
        </Card>
      </div>

      {/* Recent quotes */}
      <Card>
        <div className="label-caps mb-2">Recent quotes</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-forest-500">
            <tr>
              <th className="text-left">Captured</th>
              <th className="text-left">Product</th>
              <th className="text-right">Price</th>
              <th className="text-right">Landed USD/kg</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t border-forest-100/30">
                <td className="py-1.5">{q.capturedAt.toISOString().slice(0, 10)}</td>
                <td>{q.productNameRaw}</td>
                <td className="text-right">
                  {q.currency} {(Number(q.unitPriceMinor) / 100).toFixed(2)}/{q.unit}
                </td>
                <td className="text-right">
                  {q.landedCostUsdPerKg ? `$${(q.landedCostUsdPerKg / 1_000_000).toFixed(2)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Notes */}
      <Card>
        <div className="label-caps mb-2">NOTES</div>
        <p className="text-sm text-forest-400 italic">
          Notes section coming soon. Until then, paste notes into your CRM and they&apos;ll be imported once we wire that up.
        </p>
      </Card>
    </div>
  );
}
