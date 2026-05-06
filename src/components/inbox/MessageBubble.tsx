"use client";
import { Card } from "@/components/ui/Card";
import { InlineQuotePill } from "./InlineQuotePill";
import { QuoteActions } from "./QuoteActions";

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  senderName: string | null;
  body: string;
  sentAt: Date;
  quote?: {
    id: string;
    label: string;
    productSku: string | null;
  };
}

export function MessageBubble({ m }: { m: Msg }) {
  const out = m.direction === "outbound";
  return (
    <div className={out ? "flex justify-end my-2" : "flex justify-start my-2"}>
      <div className="w-full max-w-[560px]">
        <Card className={out ? "bg-forest-700 text-white" : "bg-white/80"}>
          <div className="text-xs opacity-70">
            {m.senderName ?? (out ? "You" : "Vendor")} · {new Date(m.sentAt).toLocaleString()}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
          {m.quote && <div><InlineQuotePill label={m.quote.label} quoteId={m.quote.id} /></div>}
        </Card>
        {m.quote && !out && (
          <QuoteActions quoteId={m.quote.id} productSku={m.quote.productSku} />
        )}
      </div>
    </div>
  );
}
