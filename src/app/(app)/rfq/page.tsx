import { db } from "@/lib/db/client";
import { rfq } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { currentOrg } from "@/lib/auth/current";

export default async function RfqList() {
  const o = await currentOrg();
  const rfqs = await db
    .select()
    .from(rfq)
    .where(eq(rfq.orgId, o.id))
    .orderBy(desc(rfq.createdAt))
    .limit(50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">RFQs</h1>
        <Link href="/rfq/new"><Button variant="secondary">New RFQ</Button></Link>
      </div>
      {rfqs.length === 0 && (
        <p className="text-sm text-forest-500">No RFQs yet. Create your first one.</p>
      )}
      <div className="grid gap-3">
        {rfqs.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.productNameRaw ?? "Untitled"}</div>
                <div className="text-xs text-forest-500">
                  Created {r.createdAt.toISOString().slice(0, 10)}
                  {r.sentAt && ` · Sent ${r.sentAt.toISOString().slice(0, 10)}`}
                </div>
              </div>
              <Pill label={r.status.toUpperCase()} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
