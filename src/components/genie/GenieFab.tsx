"use client";
import { useEffect, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { GenieSlideOver } from "./GenieSlideOver";

export function GenieFab() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-forest-700 text-lime-400 shadow-lg hover:bg-forest-500"
        aria-label="Ask TradeGenie"
      >
        <Sparkle weight="fill" size={22} />
      </button>
      <GenieSlideOver open={open} onOpenChange={setOpen} />
    </>
  );
}
