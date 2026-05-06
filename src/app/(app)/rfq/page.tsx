import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { currentOrg } from "@/lib/auth/current";
import { RfqTable } from "@/components/rfq/RfqTable";

export default async function RfqList() {
  const o = await currentOrg();
  const r = await db.execute(sql`
    SELECT r.id, r.product_name_raw, r.status, r.created_at, r.sent_at,
           (SELECT COUNT(*)::int FROM rfq_recipient rr WHERE rr.rfq_id = r.id) AS recipient_count,
           (SELECT COUNT(*)::int FROM rfq_recipient rr WHERE rr.rfq_id = r.id AND rr.response_message_id IS NOT NULL) AS responded_count
    FROM rfq r
    WHERE r.org_id = ${o.id}
    ORDER BY r.created_at DESC
    LIMIT 100
  `);
  const rows = (r.rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    productName: (row.product_name_raw as string | null) ?? "Untitled",
    status: row.status as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    sentAt: row.sent_at ? new Date(row.sent_at as string).toISOString() : null,
    recipientCount: Number(row.recipient_count ?? 0),
    respondedCount: Number(row.responded_count ?? 0),
  }));
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
      <RfqTable rows={rows} />
    </div>
  );
}
