import { Card } from "@/components/ui/Card";
import { InlineQuotePill } from "./InlineQuotePill";

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  senderName: string | null;
  body: string;
  sentAt: Date;
  quotePill?: { label: string; quoteId: string };
}

export function MessageBubble({ m }: { m: Msg }) {
  const out = m.direction === "outbound";
  return (
    <div className={out ? "flex justify-end my-2" : "flex justify-start my-2"}>
      <Card className={out ? "max-w-[70%] bg-forest-700 text-white" : "max-w-[70%] bg-white/80"}>
        <div className="text-xs opacity-70">
          {m.senderName ?? (out ? "You" : "Vendor")} · {new Date(m.sentAt).toLocaleString()}
        </div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
        {m.quotePill && <div><InlineQuotePill label={m.quotePill.label} quoteId={m.quotePill.quoteId} /></div>}
      </Card>
    </div>
  );
}
