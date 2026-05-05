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
      <div className="flex items-end justify-between">
        <div>
          <div className="label-caps">Requests for quote</div>
          <h1 className="font-display text-3xl">Ask multiple vendors at once</h1>
          <p className="mt-1 text-sm text-forest-500 max-w-2xl">
            An RFQ goes to several vendors in their preferred channel (email or WhatsApp) and tracks who responded. When the replies come in, they show up here and in your inbox — ready to compare side-by-side.
          </p>
        </div>
        <Link href="/rfq/new"><Button variant="secondary">New request</Button></Link>
      </div>
      {rfqs.length === 0 && (
        <Card>
          <div className="text-sm text-forest-500">
            No requests yet. Send your first one to start collecting comparable quotes.
          </div>
        </Card>
      )}
      <div className="grid gap-3">
        {rfqs.map((r) => (
          <Link key={r.id} href={`/rfq/${r.id}`}>
            <Card className="hover:bg-white">
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
          </Link>
        ))}
      </div>
    </div>
  );
}
