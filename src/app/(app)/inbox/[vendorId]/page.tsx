import { db } from "@/lib/db/client";
import { message, thread, quote, product } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { ThreadList } from "@/components/inbox/ThreadList";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { VendorProfileRail } from "@/components/inbox/VendorProfileRail";
import { currentOrg } from "@/lib/auth/current";

export default async function VendorThread({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const o = await currentOrg();

  const ts = await db.select().from(thread).where(eq(thread.vendorId, vendorId));
  const threadId = ts[0]?.id;

  const messages = threadId
    ? await db.select().from(message).where(eq(message.threadId, threadId)).orderBy(desc(message.sentAt))
    : [];

  const quotes = await db.select().from(quote).where(eq(quote.vendorId, vendorId));
  const byMsg = new Map(quotes.filter((q) => q.messageId).map((q) => [q.messageId!, q]));

  // Fetch products for any productIds present to get SKUs for comparison links
  const productIds = Array.from(new Set(quotes.map((q) => q.productId).filter((x): x is string => !!x)));
  const products = productIds.length
    ? await db.select({ id: product.id, sku: product.sku }).from(product).where(inArray(product.id, productIds))
    : [];
  const skuById = new Map(products.map((p) => [p.id, p.sku]));

  return (
    <div className="grid h-[calc(100vh-100px)] grid-cols-[260px_minmax(0,1fr)_320px]">
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
                quote: q
                  ? {
                      id: q.id,
                      label: `${q.currency} ${(Number(q.unitPriceMinor) / 100).toFixed(2)}/${q.unit}${q.incoterm ? ` ${q.incoterm}` : ""}`,
                      productSku: q.productId ? (skuById.get(q.productId) ?? null) : null,
                    }
                  : undefined,
              }}
            />
          );
        })}
      </div>
      <VendorProfileRail orgId={o.id} vendorId={vendorId} />
    </div>
  );
}
