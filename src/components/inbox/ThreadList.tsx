import Link from "next/link";
import { db } from "@/lib/db/client";
import { vendor, thread } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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
            <div className="text-forest-500">{r.country ?? ""} · {r.lastAt ? new Date(r.lastAt).toLocaleDateString() : "—"}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
