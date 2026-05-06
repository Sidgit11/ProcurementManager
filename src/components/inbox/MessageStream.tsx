"use client";
import { useMemo, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ArrowsDownUp } from "@phosphor-icons/react";

export interface MsgInput {
  id: string;
  direction: "inbound" | "outbound";
  senderName: string | null;
  body: string;
  sentAtIso: string;
  classification: string | null;
  quote?: { id: string; label: string; productSku: string | null };
}

type FilterKey = "ALL" | "QUOTES" | "FOLLOW_UP" | "DOCUMENT" | "NOISE";

const FILTERS: { key: FilterKey; label: string; match: (m: MsgInput) => boolean }[] = [
  { key: "ALL",       label: "All",        match: () => true },
  { key: "QUOTES",    label: "Quotes",     match: (m) => !!m.quote || m.classification === "quote" },
  { key: "FOLLOW_UP", label: "Follow-ups", match: (m) => m.classification === "follow_up" },
  { key: "DOCUMENT",  label: "Documents",  match: (m) => m.classification === "document" },
  { key: "NOISE",     label: "Other",      match: (m) => m.classification === "noise" || m.classification == null },
];

export function MessageStream({ messages }: { messages: MsgInput[] }) {
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = { ALL: messages.length, QUOTES: 0, FOLLOW_UP: 0, DOCUMENT: 0, NOISE: 0 };
    for (const m of messages) {
      for (const f of FILTERS) {
        if (f.key === "ALL") continue;
        if (f.match(m)) out[f.key]++;
      }
    }
    return out;
  }, [messages]);

  const visible = useMemo(() => {
    const matcher = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    const filtered = messages.filter(matcher);
    const sorted = [...filtered].sort((a, b) => {
      const ax = new Date(a.sentAtIso).getTime();
      const bx = new Date(b.sentAtIso).getTime();
      return order === "newest" ? bx - ax : ax - bx;
    });
    return sorted;
  }, [messages, filter, order]);

  return (
    <div className="overflow-auto p-6">
      <div className="sticky top-0 z-10 -mt-6 -mx-6 mb-3 px-6 pt-4 pb-3 bg-gradient-to-b from-bg-start to-transparent">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => {
              const isActive = filter === f.key;
              const n = counts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition " +
                    (isActive ? "bg-forest-700 text-white" : "bg-white/70 text-forest-700 hover:bg-white")
                  }
                >
                  {f.label} <span className={"ml-1 tabular-nums " + (isActive ? "opacity-80" : "text-forest-500")}>{n}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setOrder((o) => o === "newest" ? "oldest" : "newest")}
            className="inline-flex items-center gap-1 rounded-md border border-forest-100/60 bg-white/70 px-2 py-1 text-[11px] text-forest-700 hover:bg-white"
          >
            <ArrowsDownUp size={11} /> {order === "newest" ? "Newest first" : "Oldest first"}
          </button>
        </div>
      </div>
      {visible.length === 0 && (
        <div className="text-sm text-forest-500 py-8 text-center">No messages match the current filter.</div>
      )}
      {visible.map((m) => (
        <MessageBubble
          key={m.id}
          m={{
            id: m.id,
            direction: m.direction,
            senderName: m.senderName,
            body: m.body,
            sentAt: new Date(m.sentAtIso),
            quote: m.quote,
          }}
        />
      ))}
    </div>
  );
}
