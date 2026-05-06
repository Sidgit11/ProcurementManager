import Link from "next/link";
import { db } from "@/lib/db/client";
import { vendor, quote, vendorNote, qualityEvent, product } from "@/lib/db/schema";
import { eq, sql, desc, and, count } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { PaperPlaneTilt, Folders, MapPin, EnvelopeSimple, ChatCircle, Star } from "@phosphor-icons/react/dist/ssr";

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  VN: "Vietnam",
  ID: "Indonesia",
  TR: "Türkiye",
  BR: "Brazil",
};

function timeAgo(d: Date | null): string {
  if (!d) return "—";
  const m = (Date.now() - d.getTime()) / 60_000;
  if (m < 1) return "just now";
  if (m < 60) return `${Math.round(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)} hr ago`;
  const days = h / 24;
  if (days < 30) return `${Math.round(days)} d ago`;
  return `${Math.round(days / 30)} mo ago`;
}

interface TrendRow {
  product_id: string;
  product_name: string;
  unit: string;
  vendor_quote_count: number;
  vendor_mean_micros: number;
  vendor_low_micros: number;
  vendor_high_micros: number;
  market_median_micros: number | null;
  series: number[]; // landed micros, oldest → newest
}

async function loadTopCommodityTrends(orgId: string, vendorId: string): Promise<TrendRow[]> {
  // Top 3 commodities for this vendor by quote count, with stats + market comparison + sparkline series.
  const r = await db.execute(sql`
    WITH vendor_quotes AS (
      SELECT q.product_id, q.unit, q.captured_at, q.landed_cost_usd_per_kg_micros AS landed
      FROM quote q
      WHERE q.vendor_id = ${vendorId}
        AND q.landed_cost_usd_per_kg_micros IS NOT NULL
    ),
    top_products AS (
      SELECT product_id, COUNT(*) AS n
      FROM vendor_quotes
      GROUP BY product_id
      ORDER BY n DESC
      LIMIT 3
    ),
    vendor_stats AS (
      SELECT vq.product_id,
             COUNT(*) AS quote_count,
             AVG(vq.landed)::bigint AS mean_micros,
             MIN(vq.landed)::bigint AS low_micros,
             MAX(vq.landed)::bigint AS high_micros
      FROM vendor_quotes vq
      JOIN top_products tp ON tp.product_id = vq.product_id
      GROUP BY vq.product_id
    ),
    market_med AS (
      SELECT q.product_id,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY q.landed_cost_usd_per_kg_micros) AS median
      FROM quote q
      WHERE q.org_id = ${orgId}
        AND q.captured_at > now() - interval '90 days'
        AND q.landed_cost_usd_per_kg_micros IS NOT NULL
        AND q.product_id IN (SELECT product_id FROM top_products)
      GROUP BY q.product_id
    )
    SELECT vs.product_id,
           p.name AS product_name,
           (SELECT unit FROM vendor_quotes vq2 WHERE vq2.product_id = vs.product_id ORDER BY captured_at DESC LIMIT 1) AS unit,
           vs.quote_count,
           vs.mean_micros,
           vs.low_micros,
           vs.high_micros,
           mm.median AS market_median_micros,
           ARRAY(
             SELECT vq3.landed
             FROM vendor_quotes vq3
             WHERE vq3.product_id = vs.product_id
             ORDER BY vq3.captured_at ASC
             LIMIT 12
           ) AS series
    FROM vendor_stats vs
    JOIN product p ON p.id = vs.product_id
    LEFT JOIN market_med mm ON mm.product_id = vs.product_id
    ORDER BY vs.quote_count DESC
  `);

  return (r.rows as Record<string, unknown>[]).map((row) => ({
    product_id: row.product_id as string,
    product_name: row.product_name as string,
    unit: (row.unit as string) ?? "kg",
    vendor_quote_count: Number(row.quote_count),
    vendor_mean_micros: Number(row.mean_micros),
    vendor_low_micros: Number(row.low_micros),
    vendor_high_micros: Number(row.high_micros),
    market_median_micros: row.market_median_micros != null ? Number(row.market_median_micros) : null,
    series: ((row.series as number[] | null) ?? []).map((x) => Number(x)),
  }));
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="h-8 flex items-center text-[10px] text-forest-500">
        Not enough quotes yet for a trend.
      </div>
    );
  }
  const W = 240;
  const H = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = W / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  // Determine direction by comparing first half avg to second half avg
  const half = Math.floor(values.length / 2);
  const firstAvg = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondAvg = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
  const dir = secondAvg > firstAvg * 1.005 ? "up" : secondAvg < firstAvg * 0.995 ? "down" : "flat";
  const stroke = dir === "up" ? "#a64d4d" : dir === "down" ? "#3a7a4d" : "#1A3326";
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function fmtUsdPerKg(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export async function VendorProfileRail({ orgId, vendorId }: { orgId: string; vendorId: string }) {
  const [v] = await db.select().from(vendor).where(eq(vendor.id, vendorId));
  if (!v) return null;

  const [stats] = await db
    .select({
      quoteCount: count(quote.id),
      productCount: sql<number>`COUNT(DISTINCT ${quote.productId})::int`,
      lastQuoteAt: sql<Date | null>`MAX(${quote.capturedAt})`,
    })
    .from(quote)
    .where(eq(quote.vendorId, vendorId));

  const recentQuotes = await db
    .select({
      id: quote.id,
      productNameRaw: quote.productNameRaw,
      productName: product.name,
      currency: quote.currency,
      unitPriceMinor: quote.unitPriceMinor,
      unit: quote.unit,
      capturedAt: quote.capturedAt,
    })
    .from(quote)
    .leftJoin(product, eq(quote.productId, product.id))
    .where(eq(quote.vendorId, vendorId))
    .orderBy(desc(quote.capturedAt))
    .limit(5);

  const notes = await db
    .select()
    .from(vendorNote)
    .where(eq(vendorNote.vendorId, vendorId))
    .orderBy(desc(vendorNote.createdAt))
    .limit(3);

  const [issues] = await db
    .select({ n: count() })
    .from(qualityEvent)
    .where(and(eq(qualityEvent.vendorId, vendorId)));
  const issueCount = Number(issues?.n ?? 0);

  const trends = await loadTopCommodityTrends(orgId, vendorId);

  const channels = (v.channelsDetected ?? []) as string[];
  const channelLabels: Record<string, string> = {
    email: "Email",
    whatsapp_cloud: "WhatsApp",
    whatsapp_export: "WhatsApp",
    whatsapp_forward: "WhatsApp",
    voice: "Voice",
    manual: "Manual",
  };
  const uniqueChannels = [...new Set(channels.map((c) => channelLabels[c] ?? c))];

  return (
    <aside className="w-[320px] shrink-0 border-l border-forest-100/40 overflow-auto bg-white/30">
      <div className="p-4 space-y-4">
        <div>
          <div className="label-caps">Vendor</div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <h2 className="font-display text-xl leading-tight">{v.name}</h2>
            {v.scoreTier && <Pill label={v.scoreTier} />}
          </div>
        </div>

        <Card className="p-3">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <MapPin size={14} className="text-forest-500 mt-0.5 shrink-0" />
              <span>{COUNTRY_NAMES[v.country ?? ""] ?? v.country ?? "Unknown"}</span>
            </li>
            {v.primaryContact && (
              <li className="flex items-start gap-2">
                <EnvelopeSimple size={14} className="text-forest-500 mt-0.5 shrink-0" />
                <a href={`mailto:${v.primaryContact}`} className="break-all hover:underline">{v.primaryContact}</a>
              </li>
            )}
            {uniqueChannels.length > 0 && (
              <li className="flex items-start gap-2">
                <ChatCircle size={14} className="text-forest-500 mt-0.5 shrink-0" />
                <span>{uniqueChannels.join(" · ")}</span>
              </li>
            )}
          </ul>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-2.5 text-center">
            <div className="text-[10px] label-caps">Quotes</div>
            <div className="font-display text-lg leading-tight">{Number(stats?.quoteCount ?? 0)}</div>
          </Card>
          <Card className="p-2.5 text-center">
            <div className="text-[10px] label-caps">SKUs</div>
            <div className="font-display text-lg leading-tight">{Number(stats?.productCount ?? 0)}</div>
          </Card>
          <Card className="p-2.5 text-center">
            <div className="text-[10px] label-caps">Issues</div>
            <div className="font-display text-lg leading-tight">{issueCount}</div>
          </Card>
        </div>

        <div className="text-xs text-forest-500">
          Last quote: <span className="text-forest-700 font-medium">{timeAgo(stats?.lastQuoteAt ?? null)}</span>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/rfq/new"><Button variant="secondary" className="w-full justify-center"><PaperPlaneTilt size={14} /> Send RFQ</Button></Link>
          <Link href={`/vendors/${vendorId}/vault`}><Button variant="ghost" className="w-full justify-center"><Folders size={14} /> Open vault</Button></Link>
          <Link href={`/vendors/${vendorId}`}><Button variant="ghost" className="w-full justify-center"><Star size={14} /> Full profile</Button></Link>
        </div>

        {trends.length > 0 && (
          <div>
            <div className="label-caps mb-2">Price trends</div>
            <p className="text-[11px] text-forest-500 mb-2">
              How {v.name.split(" ")[0]} has priced their top SKUs, and where each sits versus your other vendors.
            </p>
            <ul className="space-y-3">
              {trends.map((t) => {
                const vsMarket =
                  t.market_median_micros && t.market_median_micros > 0
                    ? ((t.vendor_mean_micros - t.market_median_micros) / t.market_median_micros) * 100
                    : null;
                const cmpTone =
                  vsMarket == null
                    ? "bg-forest-100 text-forest-700"
                    : vsMarket > 5
                    ? "bg-red-100 text-red-900"
                    : vsMarket < -5
                    ? "bg-lime-300 text-forest-700"
                    : "bg-forest-100 text-forest-700";
                return (
                  <li key={t.product_id} className="rounded-lg bg-white/60 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xs font-medium text-forest-700 truncate">{t.product_name}</div>
                      <div className="text-[10px] text-forest-500 whitespace-nowrap">{t.vendor_quote_count} quotes</div>
                    </div>
                    <div className="mt-1.5">
                      <Sparkline values={t.series} />
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 text-center text-[10px]">
                      <div>
                        <div className="label-caps">Mean</div>
                        <div className="font-medium tabular-nums">{fmtUsdPerKg(t.vendor_mean_micros)}</div>
                      </div>
                      <div>
                        <div className="label-caps">Low</div>
                        <div className="font-medium tabular-nums">{fmtUsdPerKg(t.vendor_low_micros)}</div>
                      </div>
                      <div>
                        <div className="label-caps">High</div>
                        <div className="font-medium tabular-nums">{fmtUsdPerKg(t.vendor_high_micros)}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-forest-500">vs other vendors</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${cmpTone}`}>
                        {vsMarket == null ? "no market data" : `${vsMarket > 0 ? "+" : ""}${vsMarket.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="mt-2 text-right">
                      <Link href={`/compare`} className="text-[10px] text-forest-500 hover:underline">
                        Open comparison →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {notes.length > 0 && (
          <div>
            <div className="label-caps mb-2">Notes</div>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-white/60 p-2.5 text-xs text-forest-700">
                  {n.body}
                  <div className="mt-1 text-[10px] text-forest-500">{n.createdAt.toISOString().slice(0, 10)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="label-caps mb-2">Recent quotes</div>
          {recentQuotes.length === 0 && (
            <div className="text-xs text-forest-500">No structured quotes yet.</div>
          )}
          <ul className="space-y-1.5">
            {recentQuotes.map((q) => (
              <li key={q.id} className="flex items-baseline justify-between gap-2 text-xs">
                <div className="truncate">
                  <div className="font-medium text-forest-700 truncate">{q.productName ?? q.productNameRaw ?? "—"}</div>
                  <div className="text-forest-500">{timeAgo(q.capturedAt)}</div>
                </div>
                <div className="font-medium tabular-nums whitespace-nowrap">{q.currency} {(Number(q.unitPriceMinor) / 100).toFixed(2)}/{q.unit}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
