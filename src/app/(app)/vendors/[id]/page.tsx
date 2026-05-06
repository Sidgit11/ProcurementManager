import { db } from "@/lib/db/client";
import { vendor, quote, vendorNote, vendorContact, qualityEvent } from "@/lib/db/schema";
import { eq, sql, desc, count } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { VendorCrmPanel } from "@/components/vendor/VendorCrmPanel";
import { deriveRating, deriveBizMeta } from "@/lib/vendors/derive";
import { CheckCircle, Warning, MapPin, Briefcase, PaperPlaneTilt, Folders } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", VN: "Vietnam", ID: "Indonesia", TR: "Türkiye", BR: "Brazil",
};

export default async function VendorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [v] = await db.select().from(vendor).where(eq(vendor.id, id));
  if (!v) {
    return (
      <div className="space-y-3">
        <Breadcrumbs trail={[{ label: "Vendors", href: "/vendors" }, { label: "Not found" }]} />
        <p className="text-sm text-forest-500">Vendor not found.</p>
      </div>
    );
  }

  const stats = await db.execute(sql`
    SELECT COUNT(*)::int AS quotes_count,
           COUNT(DISTINCT product_id)::int AS products_count,
           MAX(captured_at) AS last_activity,
           AVG(landed_cost_usd_per_kg_micros) AS avg_landed_micros
    FROM quote
    WHERE vendor_id = ${id} AND landed_cost_usd_per_kg_micros IS NOT NULL
  `);
  const s = stats.rows[0] as { quotes_count: number; products_count: number; last_activity: string | null; avg_landed_micros: number | null };

  const marketMed = await db.execute(sql`
    WITH vp AS (SELECT DISTINCT product_id FROM quote WHERE vendor_id = ${id})
    SELECT AVG(med)::bigint AS m FROM (
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY q.landed_cost_usd_per_kg_micros) AS med
      FROM quote q
      JOIN vp ON vp.product_id = q.product_id
      WHERE q.captured_at > now() - interval '90 days'
        AND q.landed_cost_usd_per_kg_micros IS NOT NULL
      GROUP BY q.product_id
    ) sub
  `);
  const median = marketMed.rows[0] ? Number((marketMed.rows[0] as { m: number | null }).m ?? 0) : 0;
  const avgLanded = s.avg_landed_micros != null ? Number(s.avg_landed_micros) : null;
  const pricePct = avgLanded != null && median > 0 ? ((avgLanded - median) / median) * 100 : null;

  const [issues] = await db.select({ n: count() }).from(qualityEvent).where(eq(qualityEvent.vendorId, id));
  const issueCount = Number(issues?.n ?? 0);

  const biz = deriveBizMeta(v.name);
  const rating = deriveRating({
    scoreTier: v.scoreTier,
    pricePctVsMarket: pricePct,
    quoteCount: Number(s.quotes_count),
    issueCount,
  });

  const quotes = await db.select().from(quote).where(eq(quote.vendorId, id)).orderBy(desc(quote.capturedAt)).limit(10);
  const contacts = await db.select().from(vendorContact).where(eq(vendorContact.vendorId, id)).orderBy(desc(vendorContact.isPrimary), desc(vendorContact.createdAt));
  const notes = await db.select({ id: vendorNote.id, body: vendorNote.body, createdAt: vendorNote.createdAt }).from(vendorNote).where(eq(vendorNote.vendorId, id)).orderBy(desc(vendorNote.createdAt));
  const notesForClient = notes.map((n) => ({ id: n.id, body: n.body, createdAt: new Date(n.createdAt as unknown as string).toISOString() }));

  return (
    <div className="space-y-6 max-w-6xl">
      <Breadcrumbs trail={[{ label: "Vendors", href: "/vendors" }, { label: v.name }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl">{v.name}</h1>
            {v.scoreTier && <Pill label={v.scoreTier} />}
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-3xl text-forest-700">{rating.overall}</span>
              <span className="text-sm text-forest-500">/ 100</span>
            </div>
          </div>
          <div className="text-sm text-forest-500 mt-1 flex items-center gap-2 flex-wrap">
            <MapPin size={14} /> {COUNTRY_NAMES[v.country ?? ""] ?? v.country ?? "—"}
            <span>·</span>
            <Briefcase size={14} /> Established {biz.establishedYear} · {biz.yearsInBusiness} years in business
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/rfq/new"><Button variant="secondary"><PaperPlaneTilt size={14} /> Send RFQ</Button></Link>
          <Link href={`/vendors/${id}/vault`}><Button variant="ghost"><Folders size={14} /> Open vault</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <div className="label-caps mb-3">Rating breakdown</div>
            <div className="space-y-3">
              {([
                { label: "Price competitiveness", value: rating.priceCompetitiveness },
                { label: "Response speed",        value: rating.responseSpeed },
                { label: "Reliability",           value: rating.reliability },
                { label: "Quality consistency",   value: rating.qualityConsistency },
              ] as const).map((item) => (
                <div key={item.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-forest-700">{item.label}</span>
                    <span className="font-medium tabular-nums">{item.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-forest-100">
                    <div className={"h-1.5 rounded " + (item.value >= 75 ? "bg-lime-400" : item.value >= 50 ? "bg-forest-500" : "bg-red-300")} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-forest-500 mt-3">
              Composite signals from your captured quote history, response timestamps, and quality events. Updates with every new quote.
            </p>
          </Card>

          {(rating.strengths.length > 0 || rating.risks.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rating.strengths.length > 0 && (
                <Card>
                  <div className="label-caps mb-2">Strengths</div>
                  <ul className="space-y-1.5 text-sm">
                    {rating.strengths.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={14} weight="fill" className="text-lime-500 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {rating.risks.length > 0 && (
                <Card>
                  <div className="label-caps mb-2">Risks</div>
                  <ul className="space-y-1.5 text-sm">
                    {rating.risks.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Warning size={14} weight="fill" className="text-red-700 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          <VendorCrmPanel
            vendorId={id}
            initialContacts={contacts as never}
            initialNotes={notesForClient}
            initialPreferences={(v.preferences ?? {}) as never}
          />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2.5 text-center">
              <div className="text-[10px] label-caps">Quotes</div>
              <div className="font-display text-xl leading-tight">{Number(s.quotes_count)}</div>
            </Card>
            <Card className="p-2.5 text-center">
              <div className="text-[10px] label-caps">SKUs</div>
              <div className="font-display text-xl leading-tight">{Number(s.products_count)}</div>
            </Card>
            <Card className="p-2.5 text-center">
              <div className="text-[10px] label-caps">Issues</div>
              <div className="font-display text-xl leading-tight">{issueCount}</div>
            </Card>
          </div>

          <Card>
            <div className="label-caps mb-2">Recent quotes</div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-forest-500">
                <tr>
                  <th className="text-left">Captured</th>
                  <th className="text-left">Product</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Landed</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-forest-500 text-xs">No quotes yet.</td></tr>}
                {quotes.map((q) => (
                  <tr key={q.id} className="border-t border-forest-100/30">
                    <td className="py-1.5 text-xs">{new Date(q.capturedAt as unknown as string).toISOString().slice(0, 10)}</td>
                    <td className="text-xs truncate max-w-[120px]">{q.productNameRaw}</td>
                    <td className="text-right tabular-nums">{q.currency} {(Number(q.unitPriceMinor) / 100).toFixed(2)}</td>
                    <td className="text-right tabular-nums">
                      {q.landedCostUsdPerKg ? `$${(q.landedCostUsdPerKg / 1_000_000).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
