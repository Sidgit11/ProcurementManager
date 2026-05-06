import Link from "next/link";
import { db } from "@/lib/db/client";
import { vendor, thread } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

function relTime(d: Date | string | number | null): string {
  if (d == null) return "no activity";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "no activity";
  const ms = Date.now() - dt.getTime();
  const m = ms / 60_000;
  if (m < 60) return "just now";
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const days = h / 24;
  if (days < 7) return `${Math.round(days)}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export async function ThreadList({ orgId, selectedVendorId }: { orgId: string; selectedVendorId?: string }) {
  const rows = await db.select({
    vendorId: vendor.id,
    name: vendor.name,
    country: vendor.country,
    lastAt: thread.lastMessageAt,
  })
    .from(vendor)
    .leftJoin(thread, eq(thread.vendorId, vendor.id))
    .where(eq(vendor.orgId, orgId))
    .orderBy(desc(thread.lastMessageAt))
    .limit(80);

  return (
    <ul className="divide-y divide-forest-100/40 overflow-auto border-r border-forest-100/40">
      {rows.map((r) => (
        <li key={r.vendorId}>
          <Link
            href={`/inbox/${r.vendorId}`}
            className={
              selectedVendorId === r.vendorId
                ? "block px-4 py-3 text-sm bg-forest-100/60"
                : "block px-4 py-3 text-sm hover:bg-forest-100/30"
            }
          >
            <div className="font-medium">{r.name}</div>
            <div className="text-forest-500">{r.country ?? ""} · last quote {relTime(r.lastAt as never)}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
