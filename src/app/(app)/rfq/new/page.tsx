"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Vendor {
  id: string;
  name: string;
  country: string | null;
}

export default function NewRfq() {
  const [product, setProduct] = useState("");
  const [preview, setPreview] = useState(
    "Hi — could you share your best price for {product}, CIF Santos, validity 7 days. Thanks."
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then((data: Vendor[]) => setVendors(data))
      .catch(() => toast.error("Failed to load vendors"));
  }, []);

  async function send() {
    const r = await fetch("/api/rfq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        product,
        preview: preview.replace("{product}", product),
        vendorIds: [...selected],
      }),
    });
    if (r.ok) {
      toast.success("RFQ queued (mock send)");
      router.push("/rfq");
    } else {
      toast.error("Send failed");
    }
  }

  function toggleVendor(id: string, checked: boolean) {
    const s = new Set(selected);
    if (checked) s.add(id);
    else s.delete(id);
    setSelected(s);
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-3">
        <label className="block">
          <div className="label-caps">SKU / spec</div>
          <input
            className="mt-1 w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="50 MT Black Pepper 5mm CIF Santos"
          />
        </label>
        <label className="block">
          <div className="label-caps">Message preview</div>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
        </label>
        <Button
          onClick={send}
          variant="secondary"
          disabled={!product || selected.size === 0}
        >
          Send to {selected.size} vendors
        </Button>
      </div>
      <Card>
        <div className="label-caps mb-2">Vendors</div>
        <ul className="max-h-96 overflow-auto divide-y divide-forest-100/30">
          {vendors.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-1.5 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(v.id)}
                  onChange={(e) => toggleVendor(v.id, e.target.checked)}
                />
                {v.name}{" "}
                {v.country && <span className="text-forest-500">{v.country}</span>}
              </label>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
