import { db } from "@/lib/db/client";
import { vendor, thread } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ThreadListClient } from "./ThreadListClient";

export async function ThreadList({ orgId, selectedVendorId }: { orgId: string; selectedVendorId?: string }) {
  const rows = await db
    .select({
      vendorId: vendor.id,
      name: vendor.name,
      country: vendor.country,
      scoreTier: vendor.scoreTier,
      lastAt: thread.lastMessageAt,
    })
    .from(vendor)
    .leftJoin(thread, eq(thread.vendorId, vendor.id))
    .where(eq(vendor.orgId, orgId))
    .orderBy(desc(thread.lastMessageAt))
    .limit(200);

  // Serialize Date → ISO string so the Client Component receives plain JSON
  const serialized = rows.map((r) => ({
    vendorId: r.vendorId,
    name: r.name,
    country: r.country ?? null,
    scoreTier: r.scoreTier ?? null,
    lastAtIso: r.lastAt ? new Date(r.lastAt as unknown as string).toISOString() : null,
  }));

  return <ThreadListClient rows={serialized} selectedVendorId={selectedVendorId} />;
}
