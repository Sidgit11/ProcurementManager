"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { toast } from "sonner";
import { TrendUp, MapPin, Buildings } from "@phosphor-icons/react";

interface Candidate {
  id: string;
  name: string;
  country: string;
  topSku: string;
  monthlyShipments: number;
  shipsToCompetitors: number;
  reasoning: string;
}

const CANDIDATES: Candidate[] = [
  { id: "c1", name: "Coastal Spice Trade",   country: "IN", topSku: "Black Pepper 5mm",   monthlyShipments: 18, shipsToCompetitors: 4, reasoning: "Active exporter on US-bound shipments, similar SKU mix to your existing Mumbai vendors." },
  { id: "c2", name: "Mekong Pulse Hub",      country: "VN", topSku: "Chickpeas 12mm",     monthlyShipments: 24, shipsToCompetitors: 7, reasoning: "High shipment frequency on chickpeas; ships to two of your competitors but absent from your pool." },
  { id: "c3", name: "Java Cardamom Estate",  country: "ID", topSku: "Cardamom Large",     monthlyShipments: 9,  shipsToCompetitors: 2, reasoning: "Estate-direct exporter — typically 6-9% below trader prices for cardamom large." },
  { id: "c4", name: "Anatolia Spice Co.",    country: "TR", topSku: "Cumin 99% Pure",     monthlyShipments: 31, shipsToCompetitors: 11, reasoning: "Largest Turkish cumin exporter not currently in your pool; common counterparty for Brazilian importers." },
  { id: "c5", name: "Kerala Coir & Coconut", country: "IN", topSku: "Virgin Coconut Oil", monthlyShipments: 14, shipsToCompetitors: 3, reasoning: "Specializes in VCO; volume growth +28% YoY based on customs filings." },
  { id: "c6", name: "Lampung Pepper Direct", country: "ID", topSku: "Black Pepper 5mm",   monthlyShipments: 21, shipsToCompetitors: 6, reasoning: "Origin-direct alternative to traders for Indonesian black pepper; shorter chain typically translates to better prices." },
];

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", VN: "Vietnam", ID: "Indonesia", TR: "Türkiye", BR: "Brazil",
};

export function DiscoverGrid() {
  const [added, setAdded] = useState<Set<string>>(new Set());

  function add(c: Candidate) {
    setAdded((prev) => new Set(prev).add(c.id));
    toast.success(`${c.name} queued — we'll send a first RFQ to introduce you and capture an opening quote.`);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-lime-300/20 px-3 py-2 text-xs text-forest-700 border border-lime-400/30">
        <span className="font-semibold">Source: shipment intelligence.</span> We watch customs and bill-of-lading filings to surface exporters shipping the SKUs you buy. Real integration ships in v1.1; the candidates below are illustrative.
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {CANDIDATES.map((c) => (
          <Card key={c.id} className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-lg leading-tight">{c.name}</div>
                <div className="text-xs text-forest-500 mt-0.5 flex items-center gap-1.5">
                  <MapPin size={11} /> {COUNTRY_NAMES[c.country] ?? c.country}
                </div>
              </div>
              <Pill label="DISCOVERED" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-forest-100/40 p-2">
                <div className="text-[10px] label-caps">Top SKU</div>
                <div className="text-xs font-medium text-forest-700">{c.topSku}</div>
              </div>
              <div className="rounded-lg bg-forest-100/40 p-2">
                <div className="text-[10px] label-caps">Monthly shipments</div>
                <div className="text-xs font-medium text-forest-700 flex items-center gap-1"><TrendUp size={11} /> {c.monthlyShipments}</div>
              </div>
            </div>
            <div className="rounded-lg bg-white/60 p-2 text-xs">
              <div className="flex items-center gap-1.5 text-forest-500 mb-1"><Buildings size={11} /> Ships to {c.shipsToCompetitors} comparable buyers</div>
              <div className="text-forest-700">{c.reasoning}</div>
            </div>
            <div className="pt-1">
              {added.has(c.id)
                ? <Button variant="ghost" disabled className="w-full justify-center">Added — RFQ queued</Button>
                : <Button variant="secondary" onClick={() => add(c)} className="w-full justify-center">Add to pool &amp; open RFQ</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
