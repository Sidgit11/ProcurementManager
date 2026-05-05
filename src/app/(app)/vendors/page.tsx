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
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Vendors ({rows.length})</h1>
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
    </div>
  );
}
