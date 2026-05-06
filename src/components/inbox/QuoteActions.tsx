"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkle, Scales, ChatTeardropDots } from "@phosphor-icons/react";
import { toast } from "sonner";

export function QuoteActions({ quoteId, productSku }: { quoteId: string; productSku: string | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function promote() {
    setBusy("promote");
    try {
      const r = await fetch(`/api/quotes/${quoteId}/promote-to-opportunity`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast.error(j.error ?? "Could not add to opportunities");
        return;
      }
      const { id } = await r.json();
      toast.success("Added to buy opportunities", {
        action: { label: "Open", onClick: () => router.push(`/opportunities`) },
      });
      void id;
    } finally { setBusy(null); }
  }

  async function counter() {
    setBusy("counter");
    try {
      const r = await fetch(`/api/quotes/${quoteId}/counter-offer`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast.error(j.error ?? "Could not draft counter-offer");
        return;
      }
      toast.success("Counter-offer drafted", {
        action: { label: "Review", onClick: () => router.push(`/agents`) },
      });
    } finally { setBusy(null); }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-1">
      <button
        onClick={promote}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 rounded-full bg-lime-400 px-2.5 py-1 text-[11px] font-semibold text-forest-700 hover:bg-lime-500 disabled:opacity-60"
      >
        <Sparkle size={11} weight="fill" /> {busy === "promote" ? "Adding…" : "Add to opportunities"}
      </button>
      {productSku && (
        <Link
          href={`/compare/${productSku}`}
          className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-forest-100/60 px-2.5 py-1 text-[11px] font-medium text-forest-700 hover:bg-white"
        >
          <Scales size={11} /> Compare vendors
        </Link>
      )}
      <button
        onClick={counter}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-forest-100/60 px-2.5 py-1 text-[11px] font-medium text-forest-700 hover:bg-white disabled:opacity-60"
      >
        <ChatTeardropDots size={11} /> {busy === "counter" ? "Drafting…" : "Draft counter-offer"}
      </button>
    </div>
  );
}
