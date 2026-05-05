import { db } from "@/lib/db/client";
import { message, thread, quote } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { ThreadList } from "@/components/inbox/ThreadList";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { currentOrg } from "@/lib/auth/current";

export default async function VendorThread({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const o = await currentOrg();

  const ts = await db.select().from(thread).where(eq(thread.vendorId, vendorId));
  const threadId = ts[0]?.id;

  const messages = threadId
    ? await db.select().from(message).where(eq(message.threadId, threadId)).orderBy(asc(message.sentAt))
    : [];

  const quotes = await db.select().from(quote).where(eq(quote.vendorId, vendorId));
  const byMsg = new Map(quotes.filter((q) => q.messageId).map((q) => [q.messageId!, q]));

  return (
    <div className="grid h-[calc(100vh-100px)] grid-cols-[280px_1fr]">
      <ThreadList orgId={o.id} selectedVendorId={vendorId} />
      <div className="overflow-auto p-6">
        {messages.length === 0 && <div className="text-sm text-forest-500">No messages yet for this vendor.</div>}
        {messages.map((m) => {
          const q = byMsg.get(m.id);
          return (
            <MessageBubble
              key={m.id}
              m={{
                id: m.id,
                direction: m.direction,
                senderName: m.senderName,
                body: m.body,
                sentAt: m.sentAt,
                quotePill: q
                  ? {
                      quoteId: q.id,
                      label: `${q.currency} ${(Number(q.unitPriceMinor) / 100).toFixed(2)}/${q.unit}${q.incoterm ? ` ${q.incoterm}` : ""}`,
                    }
                  : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
