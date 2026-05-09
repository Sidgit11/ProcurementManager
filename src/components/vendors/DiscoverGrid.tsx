"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { toast } from "sonner";
import { TrendUp, MapPin, Buildings, ArrowsClockwise, MagnifyingGlass } from "@phosphor-icons/react";

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
  // Cassia cinnamon
  { id: "c1",  name: "Vinasamex Co., Ltd.",                         country: "VN", topSku: "Cassia Cinnamon BC1", monthlyShipments: 18, shipsToCompetitors: 4, reasoning: "Vietnam's largest organic cassia exporter (Yen Bai region). Active on US and EU lanes; not yet in your pool." },
  { id: "c2",  name: "PT Cassiavera Indonesia",                     country: "ID", topSku: "Cassia Cinnamon Korintje", monthlyShipments: 12, shipsToCompetitors: 3, reasoning: "Indonesian Korintje cassia specialist. Origin-direct from Kerinci; typically 4-7% below Vietnamese trader prices." },
  // Dried apricots
  { id: "c3",  name: "Tariş Kuru Meyve Birliği",                    country: "TR", topSku: "Dried Apricots #1 (Standard 5)", monthlyShipments: 22, shipsToCompetitors: 6, reasoning: "Malatya farmers' co-op; one of Turkey's top dried-fruit exporters. Premium grade, organic-certified options available." },
  { id: "c4",  name: "Antalya Hazır Gıda",                          country: "TR", topSku: "Dried Apricots #2 (Standard 6)", monthlyShipments: 15, shipsToCompetitors: 8, reasoning: "Mid-tier Standard 5/6 grade exporter. Active on Brazilian lane via Mersin. Competitive on volume." },
  // Almonds
  { id: "c5",  name: "Borges International Group",                  country: "ES", topSku: "Almonds Marcona / NPX", monthlyShipments: 28, shipsToCompetitors: 9, reasoning: "Catalonia-based, top-3 Spanish almond exporter. Premium Marcona at one end, NPX at the other — broad portfolio." },
  { id: "c6",  name: "Blue Diamond Growers",                        country: "US", topSku: "Almonds Nonpareil", monthlyShipments: 35, shipsToCompetitors: 14, reasoning: "California co-operative — world's largest almond processor. US tariff context worth modelling before committing volume." },
  // Cumin
  { id: "c7",  name: "Synthite Industries Ltd.",                    country: "IN", topSku: "Cumin Seeds Whole / Powder", monthlyShipments: 20, shipsToCompetitors: 7, reasoning: "Kerala-based major spice processor. Direct from Unjha mandi; competitive on whole and powdered cumin." },
  { id: "c8",  name: "Akay Spices Pvt., Ltd.",                      country: "IN", topSku: "Turmeric Curcumin / Cumin", monthlyShipments: 14, shipsToCompetitors: 5, reasoning: "Kochi-based; specialist in spice extracts but also competitive on whole spices. Strong CoA documentation." },
  // Turmeric
  { id: "c9",  name: "Olam Agri (India)",                            country: "IN", topSku: "Turmeric Whole / Powder", monthlyShipments: 26, shipsToCompetitors: 11, reasoning: "Global trading house with strong India sourcing. Reliable volumes; pricing usually mid-market but quality consistent." },
  // Dried vegetables / onion
  { id: "c10", name: "Garlico Industries Ltd.",                     country: "IN", topSku: "Dehydrated Onion / Garlic", monthlyShipments: 19, shipsToCompetitors: 6, reasoning: "Mahuva (Gujarat) dehydration specialist. Onion flakes, powder, granules — typically 5-8% below Chinese alternatives on quality grade." },
  { id: "c11", name: "Universal Spice Trading",                     country: "EG", topSku: "Dried Mixed Vegetables / Herbs", monthlyShipments: 11, shipsToCompetitors: 3, reasoning: "Cairo-based; specialist in Egyptian dried vegetables and herb blends. Competitive on small-batch artisan packs." },
  { id: "c12", name: "Ali Akmaz Tarım Ürünleri",                    country: "TR", topSku: "Dried Vegetable Mix / Herbs", monthlyShipments: 8,  shipsToCompetitors: 2, reasoning: "Konya-based; high-quality Anatolian dried vegetables. Works mostly with European retail brands — would expand to Brazil." },
];

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", VN: "Vietnam", ID: "Indonesia", TR: "Türkiye", BR: "Brazil",
  EG: "Egypt", ES: "Spain", US: "United States",
};

export function DiscoverGrid() {
  const [search, setSearch] = useState("");
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    let list = [...CANDIDATES];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.topSku.toLowerCase().includes(q) ||
        (COUNTRY_NAMES[c.country]?.toLowerCase() ?? "").includes(q)
      );
    }
    if (shuffleSeed > 0) {
      // Deterministic shuffle based on seed (so repeated renders with the same seed give the same order)
      list = [...list].sort((a, b) => {
        const ha = ((a.id.charCodeAt(0) + shuffleSeed) * 9301 + 49297) % 233280;
        const hb = ((b.id.charCodeAt(0) + shuffleSeed) * 9301 + 49297) % 233280;
        return ha - hb;
      });
    }
    return list;
  }, [search, shuffleSeed]);

  async function addAndIntro(c: Candidate) {
    setBusy(c.id);
    try {
      const r = await fetch("/api/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: c.name,
          country: c.country,
          channelsDetected: ["email"],
        }),
      });
      if (!r.ok) {
        toast.error("Could not add to pool");
        return;
      }
      const created = await r.json() as { id: string };
      toast.success(`${c.name} added to your pool`);
      router.push(`/rfq/new?vendor=${created.id}&intro=1&product=${encodeURIComponent(c.topSku)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-lime-300/20 px-3 py-2 text-xs text-forest-700 border border-lime-400/30">
        <span className="font-semibold">Source: shipment intelligence + open trade registries.</span> We watch customs and bill-of-lading filings to surface exporters shipping the SKUs you buy. Real integration ships in v1.1; the candidates below are real companies illustrative of the discovery surface.
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 rounded-lg border border-forest-100/60 bg-white/60 px-3 py-1.5">
          <MagnifyingGlass size={14} className="text-forest-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, country, or commodity…"
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <button
          onClick={() => setShuffleSeed(Date.now())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-forest-100/60 bg-white/60 px-3 py-1.5 text-sm text-forest-700 hover:bg-white"
        >
          <ArrowsClockwise size={14} /> Refresh
        </button>
        <span className="text-xs text-forest-500">{filtered.length} of {CANDIDATES.length}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
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
              <Button
                variant="secondary"
                onClick={() => addAndIntro(c)}
                disabled={busy === c.id}
                className="w-full justify-center"
              >
                {busy === c.id ? "Adding…" : "Add to pool & introduce"}
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-forest-500 py-8">
            No candidates match &quot;{search}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
