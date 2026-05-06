import { db } from "@/lib/db/client";
import { vendor, quote, vendorContact, vendorNote } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { VendorCrmPanel } from "@/components/vendor/VendorCrmPanel";

export default async function VendorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [v] = await db.select().from(vendor).where(eq(vendor.id, id));
  if (!v) return <div className="text-sm text-forest-500">Vendor not found.</div>;

  const contacts = await db.select().from(vendorContact).where(eq(vendorContact.vendorId, id));
  const notesRaw = await db.select({ id: vendorNote.id, body: vendorNote.body, createdAt: vendorNote.createdAt })
    .from(vendorNote).where(eq(vendorNote.vendorId, id)).orderBy(desc(vendorNote.createdAt));
  const notesForClient = notesRaw.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
  }));

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
          This profile updates automatically with every captured reply. Contacts, preferences, and notes are managed below.
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

      {/* CRM Panel: Contacts, Preferences, Notes */}
      <VendorCrmPanel
        vendorId={id}
        initialContacts={contacts as never}
        initialNotes={notesForClient}
        initialPreferences={(v.preferences ?? {}) as never}
      />
    </div>
  );
}
