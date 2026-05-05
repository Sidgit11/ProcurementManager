import { db } from "@/lib/db/client";
import { rfq, rfqRecipient, vendor } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default async function RfqDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [r] = await db.select().from(rfq).where(eq(rfq.id, id));
  if (!r) {
    return (
      <div className="text-sm text-forest-500">
        RFQ not found. <Link href="/rfq" className="underline">Back to RFQs</Link>
      </div>
    );
  }

  const recipients = await db
    .select({
      id: rfqRecipient.id,
      vendorId: rfqRecipient.vendorId,
      channel: rfqRecipient.channel,
      preview: rfqRecipient.preview,
      sentAt: rfqRecipient.sentAt,
      responseMessageId: rfqRecipient.responseMessageId,
      vendorName: vendor.name,
      vendorCountry: vendor.country,
      vendorTier: vendor.scoreTier,
    })
    .from(rfqRecipient)
    .leftJoin(vendor, eq(rfqRecipient.vendorId, vendor.id))
    .where(eq(rfqRecipient.rfqId, id));

  const respondedCount = recipients.filter((x) => x.responseMessageId != null).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/rfq" className="text-forest-500 hover:text-forest-700"><ArrowLeft size={18} /></Link>
        <div className="label-caps">Request for quote</div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl">{r.productNameRaw ?? "Untitled RFQ"}</h1>
          <Pill label={r.status.toUpperCase()} />
        </div>
        <div className="mt-1 text-sm text-forest-500">
          Created {r.createdAt.toISOString().slice(0, 10)}
          {r.sentAt && ` · Sent ${r.sentAt.toISOString().slice(0, 10)}`} · {recipients.length} vendors · {respondedCount} responded
        </div>
      </div>

      <Card>
        <div className="label-caps mb-2">What happens next</div>
        <p className="text-sm text-forest-700">
          {r.status === "draft" && "This RFQ is still a draft. Send it to start collecting quotes."}
          {r.status === "sent" && respondedCount === 0 && "Sent. Vendors typically respond within 24–72 hours. Once replies arrive on email or WhatsApp, they'll appear here automatically."}
          {r.status === "sent" && respondedCount > 0 && respondedCount < recipients.length && `${respondedCount} of ${recipients.length} vendors have responded so far. Compare side-by-side once you have enough quotes.`}
          {r.status === "sent" && respondedCount === recipients.length && "All vendors have responded. Open the comparison to pick a winner."}
          {r.status === "won" && "You picked a winning quote. The PO is in your purchase orders."}
          {r.status === "lost" && "This RFQ was closed without a buy decision."}
          {r.status === "expired" && "Validity windows on these quotes have passed."}
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Link href={`/compare`}><Button variant="secondary">Compare responses</Button></Link>
          <Link href="/rfq/new"><Button variant="ghost">Send another RFQ</Button></Link>
        </div>
      </Card>

      <div>
        <h2 className="font-display text-xl mb-2">Recipients & responses</h2>
        <div className="grid gap-2">
          {recipients.length === 0 && (
            <Card>
              <div className="text-sm text-forest-500">No recipients yet.</div>
            </Card>
          )}
          {recipients.map((rcp) => (
            <Card key={rcp.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{rcp.vendorName ?? "Unknown vendor"}</div>
                    {rcp.vendorTier && <Pill label={rcp.vendorTier} />}
                    <span className="text-xs text-forest-500">{rcp.vendorCountry ?? ""} · via {rcp.channel.replace("_", " ")}</span>
                  </div>
                  {rcp.sentAt && <div className="text-xs text-forest-500 mt-0.5">Sent {new Date(rcp.sentAt).toLocaleString()}</div>}
                </div>
                <Pill label={rcp.responseMessageId ? "RESPONDED" : "AWAITING"} />
              </div>
              <div className="mt-2 text-sm text-forest-700 whitespace-pre-wrap line-clamp-3">{rcp.preview}</div>
              <div className="mt-3 flex gap-2">
                <Link href={`/inbox/${rcp.vendorId}`}><Button variant="ghost">Open thread</Button></Link>
                {!rcp.responseMessageId && <Button variant="ghost" disabled>Nudge (coming soon)</Button>}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
