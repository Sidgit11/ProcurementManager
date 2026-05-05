import Link from "next/link";
import { db } from "@/lib/db/client";
import { vendor } from "@/lib/db/schema";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { eq, asc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export default async function Vendors() {
  const o = await currentOrg();
  const rows = await db.select().from(vendor).where(eq(vendor.orgId, o.id)).orderBy(asc(vendor.name));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <div className="label-caps">VENDORS</div>
        <h1 className="font-display text-3xl mt-1">Everyone you&apos;ve ever been quoted by, automatically</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Profiles build themselves from your captured conversations. Score tiers update with every new quote:{" "}
          <strong>RELIABLE</strong> if fast and competitive, <strong>AGGRESSIVE</strong> if very cheap but
          inconsistent, <strong>SLOW</strong> if response time drags, <strong>OUTLIER</strong> if consistently
          overpriced.
        </p>
      </div>

      {/* Tier legend */}
      <div className="flex items-center gap-1 text-xs text-forest-500 flex-wrap">
        <span className="label-caps mr-2">TIER GUIDE:</span>
        <span className="rounded px-2 py-0.5 bg-forest-100/60">All ({rows.length})</span>
        <span className="rounded px-2 py-0.5 bg-lime-400/20 text-lime-700">Reliable</span>
        <span className="rounded px-2 py-0.5 bg-orange-400/20 text-orange-700">Aggressive</span>
        <span className="rounded px-2 py-0.5 bg-yellow-400/20 text-yellow-700">Slow</span>
        <span className="rounded px-2 py-0.5 bg-red-400/20 text-red-700">Outlier</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-forest-500">
          No vendors yet. Upload a WhatsApp chat export on the onboarding page to populate your vendor list.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {rows.map((v) => (
            <Link key={v.id} href={`/vendors/${v.id}`}>
              <Card className="hover:bg-white">
                <div className="flex items-start justify-between">
                  <div className="font-medium">{v.name}</div>
                  {v.scoreTier && <Pill label={v.scoreTier} />}
                </div>
                <div className="mt-1 text-sm text-forest-500">{v.country ?? "—"}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
