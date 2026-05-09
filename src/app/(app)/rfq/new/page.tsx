"use client";
import { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";

interface Vendor {
  id: string;
  name: string;
  country: string | null;
}

const INTRO_TEMPLATE = (vendorName: string, product: string) =>
  `Hi ${vendorName.split(" ")[0]},

I'm Lucas Oliveira at Polico Comercial de Alimentos in Brazil. We import ${product || "a range of dried foods and spices"} for distribution into the Brazilian retail and food-service channels.

We came across your name through trade intelligence and would love to start a conversation. Could you share:

  • Your current FOB price for ${product || "your top SKU"}
  • Available grades and packaging
  • Earliest dispatch window for a 1MT trial container
  • Standard payment terms
  • CoA / phytosanitary template

Looking forward to hearing from you.

Best regards,
Lucas`;

const STANDARD_TEMPLATE =
  "Hi — could you share your best price for {product}, FOB origin port, validity 7 days. Thanks.";

function NewRfqInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const presetVendorId = sp.get("vendor");
  const isIntro = sp.get("intro") === "1";
  const presetProduct = sp.get("product") ?? "";

  const [product, setProduct] = useState(presetProduct);
  const [preview, setPreview] = useState(STANDARD_TEMPLATE);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(presetVendorId ? new Set([presetVendorId]) : new Set());
  const [presetVendor, setPresetVendor] = useState<Vendor | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; category: string; body: string }[]>([]);

  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then((data: Vendor[]) => {
        setVendors(data);
        if (presetVendorId) {
          const v = data.find((x) => x.id === presetVendorId);
          if (v) {
            setPresetVendor(v);
            if (isIntro) setPreview(INTRO_TEMPLATE(v.name, presetProduct));
          }
        }
      })
      .catch(() => toast.error("Failed to load vendors"));
  }, [presetVendorId, isIntro, presetProduct]);

  useEffect(() => {
    fetch("/api/rfq/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => { /* ignore */ });
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
      toast.success(presetVendor ? `Introduction sent to ${presetVendor.name} (mock)` : "RFQ queued (mock send)");
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

  // Single-vendor intro flow
  if (presetVendor) {
    return (
      <div className="space-y-4">
        <div className="mb-3">
          <Breadcrumbs trail={[{ label: "Requests", href: "/rfq" }, { label: isIntro ? "Introduce vendor" : "New request" }]} />
        </div>
        <div className="max-w-2xl space-y-4">
          {isIntro && (
            <div className="rounded-lg border border-lime-400/40 bg-lime-300/20 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkle size={14} weight="fill" className="text-forest-700" />
                <span className="font-semibold text-forest-700">Introducing yourself to {presetVendor.name}</span>
              </div>
              <p className="text-xs text-forest-500">
                First-touch message. We&apos;ve drafted a template asking for opening price, grades, packaging, payment terms, and documentation. Edit before sending.
              </p>
            </div>
          )}
          <div>
            <div className="label-caps">{isIntro ? "Send introduction" : "Send RFQ"}</div>
            <h1 className="font-display text-2xl mt-1">To: {presetVendor.name}</h1>
            <div className="text-xs text-forest-500 mt-0.5">{presetVendor.country ?? "—"} · via email</div>
          </div>
          <Card>
            <label className="block">
              <div className="label-caps">SKU / spec</div>
              <input
                className="mt-1 w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Cassia Cinnamon BC1, 1MT trial container"
              />
            </label>
          </Card>
          <Card>
            <label className="block">
              <div className="label-caps">Message</div>
              <textarea
                rows={14}
                className="mt-1 w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm font-mono"
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
              />
            </label>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button variant="secondary" onClick={send} disabled={!product && !isIntro}>
              {isIntro ? "Send introduction" : "Send RFQ"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-vendor RFQ flow (existing)
  return (
    <div className="space-y-4">
      <div className="mb-3">
        <Breadcrumbs trail={[{ label: "Requests", href: "/rfq" }, { label: "New request" }]} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        {/* Left — form */}
        <div className="space-y-3">
          {templates.length > 0 && (
            <label className="block">
              <div className="label-caps">Start from a template (optional)</div>
              <div className="mt-1 flex gap-2">
                <select
                  onChange={(e) => {
                    const t = templates.find((x) => x.id === e.target.value);
                    if (t) {
                      setPreview(t.body);
                      toast.message(`Loaded "${t.name}" — fill in the SKU then send.`);
                    }
                  }}
                  defaultValue=""
                  className="flex-1 rounded-lg border border-forest-100/60 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Pick a template —</option>
                  {(["price_inquiry", "negotiation", "documents"] as const).map((cat) => {
                    const items = templates.filter((t) => t.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <optgroup key={cat} label={cat === "price_inquiry" ? "Price inquiry" : cat === "negotiation" ? "Negotiation" : "Documents"}>
                        {items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                <Link href="/rfq/templates" className="text-xs text-forest-500 hover:underline self-center whitespace-nowrap">Manage templates →</Link>
              </div>
            </label>
          )}
          <label className="block">
            <div className="label-caps">SKU / spec</div>
            <input
              className="mt-1 w-full rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="50 MT Black Pepper 5mm FOB origin port"
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
          <Button onClick={send} variant="secondary" disabled={!product || selected.size === 0}>
            Send to {selected.size} vendors
          </Button>
        </div>
        {/* Right — vendor list */}
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
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewRfqInner />
    </Suspense>
  );
}
