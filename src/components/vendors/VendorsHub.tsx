"use client";
import { useState } from "react";
import { VendorsTable } from "./VendorsTable";
import { DiscoverGrid } from "./DiscoverGrid";

interface MyVendorRow {
  id: string; name: string; country: string; scoreTier: string;
  quoteCount: number; skuCount: number; lastQuoteAt: string | null; issueCount: number;
}

export function VendorsHub({ myVendors }: { myVendors: MyVendorRow[] }) {
  const [tab, setTab] = useState<"pool" | "discover">("pool");
  return (
    <div className="space-y-4">
      <div>
        <div className="label-caps">Vendors</div>
        <h1 className="font-display text-3xl">Your supplier intelligence</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Profiles in your pool build themselves from your captured conversations. Discover new suppliers from shipment intelligence — exporters who ship the SKUs you buy, to buyers like you.
        </p>
      </div>
      <div className="flex items-center gap-1 border-b border-forest-100/40">
        <button
          onClick={() => setTab("pool")}
          className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition " + (tab === "pool" ? "border-forest-700 text-forest-700" : "border-transparent text-forest-500 hover:text-forest-700")}
        >
          My pool ({myVendors.length})
        </button>
        <button
          onClick={() => setTab("discover")}
          className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition " + (tab === "discover" ? "border-forest-700 text-forest-700" : "border-transparent text-forest-500 hover:text-forest-700")}
        >
          Discover
        </button>
      </div>
      {tab === "pool" ? <VendorsTable rows={myVendors} /> : <DiscoverGrid />}
    </div>
  );
}
