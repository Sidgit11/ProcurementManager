"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { CheckCircle, Circle, ChatTeardropDots, FileText, House, ArrowSquareOut, Printer, PaperPlaneTilt } from "@phosphor-icons/react";

interface Vendor {
  id: string; name: string; country: string; scoreTier: string | null;
  primaryContact: { name: string; email: string | null; phone: string | null; whatsapp: string | null; preferredChannel: string | null } | null;
  allContacts: Array<{ id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null; isPrimary: boolean }>;
}
interface Product { id: string; sku: string; name: string; defaultUnit: string }
interface Quote {
  id: string; unitPriceMinor: number; currency: string; unit: string;
  incoterm: string | null; origin: string | null; packaging: string | null;
  leadTimeDays: number | null; paymentTerms: string | null;
  validityUntil: string | null; landedCostUsdPerKg: number | null;
}
interface Opportunity {
  id: string; status: string; score: number;
  reasoning: string | null; counterfactual: string | null; expiresAt: string | null;
}
interface Insights {
  vendorAvgMicros: number | null;
  vendorLowMicros: number | null;
  marketMedianMicros: number | null;
  competitorsBelowCount: number;
  suggestedTargetMicros: number;
  rationaleBullets: string[];
}
interface EventRow { id: string; kind: string; payload: Record<string, unknown>; createdAt: string }

type Tab = "overview" | "negotiate" | "po";

const STAGES = [
  { key: "open",         label: "Open" },
  { key: "in_review",    label: "In review" },
  { key: "negotiating",  label: "Negotiating" },
  { key: "po_drafted",   label: "PO drafted" },
  { key: "po_sent",      label: "PO sent" },
  { key: "won",          label: "Won" },
];
const TERMINAL_NEG = ["lost", "dismissed", "snoozed"];

function stageIndex(s: string): number {
  const i = STAGES.findIndex((x) => x.key === s);
  return i === -1 ? 0 : i;
}

function fmtMicros(m: number | null): string {
  if (m == null) return "—";
  return `$${(m / 1_000_000).toFixed(2)}/kg`;
}

export function OpportunityHub({
  opportunity,
  vendor: v,
  product: p,
  quote: q,
  insights,
  existingPoId,
  existingNegotiationDraft,
  orgDefaults,
  events,
}: {
  opportunity: Opportunity;
  vendor: Vendor;
  product: Product | null;
  quote: Quote;
  insights: Insights;
  existingPoId: string | null;
  existingNegotiationDraft: string | null;
  orgDefaults: { homePort: string; homeCurrency: string; orgName: string };
  events: EventRow[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<string>(opportunity.status);
  const router = useRouter();

  const [now] = useState(() => Date.now());
  const expiresIn = opportunity.expiresAt ? Math.max(0, (new Date(opportunity.expiresAt).getTime() - now) / 86_400_000) : null;
  const isTerminal = TERMINAL_NEG.includes(status);
  const currentIdx = stageIndex(status);

  async function transition(next: string) {
    const r = await fetch(`/api/opportunities/${opportunity.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) {
      setStatus(next);
      toast.success(`Marked as ${next.replace("_", " ")}`);
      router.refresh();
    } else {
      toast.error("Could not update status");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl">{p?.name ?? "Opportunity"}</h1>
            <span className="rounded-full bg-lime-300 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-forest-700">
              STRENGTH {Math.min(100, Math.round(opportunity.score / 10_000))}
            </span>
            <Pill label={status.replace("_", " ").toUpperCase()} />
          </div>
          <div className="text-sm text-forest-500 mt-1 flex items-center gap-2 flex-wrap">
            <Link href={`/vendors/${v.id}`} className="hover:underline text-forest-700">{v.name}</Link>
            <span>·</span>
            <span>{v.country}</span>
            {v.scoreTier && <Pill label={v.scoreTier} />}
            <span>·</span>
            <span className="font-medium tabular-nums text-forest-700">
              {q.currency} {(q.unitPriceMinor / 100).toFixed(2)}/{q.unit} {q.incoterm}
              {q.landedCostUsdPerKg != null && <> · landed {fmtMicros(q.landedCostUsdPerKg)}</>}
            </span>
            {expiresIn != null && (
              <>
                <span>·</span>
                <span className={expiresIn < 2 ? "text-red-700 font-medium" : ""}>
                  {expiresIn < 1 ? "Expires today" : `Expires in ${Math.ceil(expiresIn)} ${Math.ceil(expiresIn) === 1 ? "day" : "days"}`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stages timeline */}
      <Card className="py-3">
        {isTerminal ? (
          <div className="text-sm">
            <div className="label-caps mb-1">Final state</div>
            <div className="font-medium text-forest-700">{status.toUpperCase()}</div>
          </div>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto">
            {STAGES.map((s, i) => {
              const reached = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-1 shrink-0">
                  <div className={
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium " +
                    (isCurrent ? "bg-forest-700 text-white"
                      : reached ? "bg-lime-300 text-forest-700"
                      : "bg-white/60 text-forest-500")
                  }>
                    {reached ? <CheckCircle size={11} weight="fill" /> : <Circle size={11} />}
                    {s.label}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={"h-px w-4 " + (i < currentIdx ? "bg-lime-400" : "bg-forest-100")} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {!isTerminal && status !== "won" && (
            <>
              <Button variant="ghost" onClick={() => transition("won")}>Mark won</Button>
              <Button variant="ghost" onClick={() => transition("lost")}>Mark lost</Button>
              <Button variant="ghost" onClick={() => transition("snoozed")}>Snooze</Button>
              <Button variant="ghost" onClick={() => transition("dismissed")}>Dismiss</Button>
            </>
          )}
          {isTerminal && (
            <Button variant="ghost" onClick={() => transition("open")}>Reopen</Button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-forest-100/40">
        <TabButton active={tab === "overview"}  onClick={() => setTab("overview")}><House size={13}/> Overview</TabButton>
        <TabButton active={tab === "negotiate"} onClick={() => setTab("negotiate")}><ChatTeardropDots size={13}/> Negotiate</TabButton>
        <TabButton active={tab === "po"}        onClick={() => setTab("po")}><FileText size={13}/> Generate PO</TabButton>
      </div>

      {tab === "overview" && (
        <OverviewTab opportunity={opportunity} vendor={v} product={p} quote={q} insights={insights} events={events} />
      )}
      {tab === "negotiate" && (
        <NegotiateTab
          opportunityId={opportunity.id}
          vendor={v} product={p} quote={q}
          insights={insights}
          existingDraft={existingNegotiationDraft}
          onSent={() => { setStatus("negotiating"); toast.success("Negotiation message sent (mock)"); router.refresh(); }}
        />
      )}
      {tab === "po" && (
        <GeneratePoTab
          opportunityId={opportunity.id}
          vendor={v} product={p} quote={q}
          orgDefaults={orgDefaults}
          existingPoId={existingPoId}
          onPoCreated={() => { setStatus("po_drafted"); router.refresh(); }}
          onPoSent={() => { setStatus("po_sent"); router.refresh(); }}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 " +
        (active ? "border-forest-700 text-forest-700" : "border-transparent text-forest-500 hover:text-forest-700")
      }
    >
      {children}
    </button>
  );
}

function OverviewTab({ opportunity, vendor: v, product: p, quote: q, insights, events }: {
  opportunity: Opportunity; vendor: Vendor; product: Product | null; quote: Quote; insights: Insights; events: EventRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <div className="label-caps mb-2">Why this is on your list</div>
          {opportunity.reasoning ? <p className="text-sm text-forest-700 whitespace-pre-wrap">{opportunity.reasoning}</p>
            : <p className="text-sm text-forest-500">Promoted from inbox.</p>}
          {opportunity.counterfactual && (
            <div className="mt-3 pt-3 border-t border-forest-100/30">
              <div className="text-xs label-caps mb-1">Counterfactual</div>
              <p className="text-sm text-forest-700">{opportunity.counterfactual}</p>
            </div>
          )}
        </Card>
        <Card>
          <div className="label-caps mb-2">Key numbers</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Metric label="Quoted" value={`${q.currency} ${(q.unitPriceMinor / 100).toFixed(2)}/${q.unit}`} sub={q.incoterm ?? ""} />
            <Metric label="Landed" value={fmtMicros(q.landedCostUsdPerKg)} />
            <Metric label="Vendor avg (90d)" value={fmtMicros(insights.vendorAvgMicros)} />
            <Metric label="Market median" value={fmtMicros(insights.marketMedianMicros)} />
            <Metric label="Origin" value={q.origin ?? "—"} />
            <Metric label="Lead time" value={q.leadTimeDays != null ? `${q.leadTimeDays}d` : "—"} />
            <Metric label="Payment" value={q.paymentTerms ?? "—"} />
            <Metric label="Packaging" value={q.packaging ?? "—"} />
          </div>
        </Card>
        {events.length > 0 && (
          <Card>
            <div className="label-caps mb-2">Activity</div>
            <ul className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3">
                  <span className="text-forest-700">{describeEvent(e)}</span>
                  <span className="text-xs text-forest-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <div className="space-y-3">
        <Card>
          <div className="label-caps mb-2">Vendor</div>
          <div className="font-medium">{v.name}</div>
          <div className="text-xs text-forest-500">{v.country} {v.scoreTier ? `· ${v.scoreTier}` : ""}</div>
          {v.primaryContact && (
            <div className="mt-2 text-sm">
              <div className="font-medium">{v.primaryContact.name}</div>
              {v.primaryContact.email && <a href={`mailto:${v.primaryContact.email}`} className="text-xs text-forest-500 hover:underline block break-all">{v.primaryContact.email}</a>}
              {v.primaryContact.whatsapp && <div className="text-xs text-forest-500">WhatsApp: {v.primaryContact.whatsapp}</div>}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-1">
            <Link href={`/vendors/${v.id}`} className="text-xs text-forest-700 hover:underline inline-flex items-center gap-1">
              <ArrowSquareOut size={11} /> Full profile
            </Link>
            <Link href={`/inbox/${v.id}`} className="text-xs text-forest-700 hover:underline inline-flex items-center gap-1">
              <ArrowSquareOut size={11} /> Open thread
            </Link>
            {p && (
              <Link href={`/compare/${p.sku}`} className="text-xs text-forest-700 hover:underline inline-flex items-center gap-1">
                <ArrowSquareOut size={11} /> Compare {p.name}
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] label-caps">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-forest-500">{sub}</div>}
    </div>
  );
}

function describeEvent(e: EventRow): string {
  const map: Record<string, string> = {
    "opportunity.created":          "Opportunity created",
    "opportunity.status_changed":   `Status → ${(e.payload.to as string ?? "").replace("_", " ")}`,
    "opportunity.negotiation_sent": `Negotiation message sent via ${e.payload.channel ?? "channel"}`,
    "opportunity.po_drafted":       "Purchase order drafted",
    "opportunity.po_sent":          `PO sent via ${e.payload.channel ?? "channel"}`,
  };
  return map[e.kind] ?? e.kind;
}

function NegotiateTab({ opportunityId, vendor: v, product: p, quote: q, insights, existingDraft, onSent }: {
  opportunityId: string; vendor: Vendor; product: Product | null; quote: Quote; insights: Insights;
  existingDraft: string | null; onSent: () => void;
}) {
  const targetUsdPerKg = (insights.suggestedTargetMicros / 1_000_000).toFixed(2);
  const defaultMessage = existingDraft ?? buildNegotiationMessage({
    vendorName: v.name,
    productName: p?.name ?? "the product",
    currentPrice: `${q.currency} ${(q.unitPriceMinor / 100).toFixed(2)}/${q.unit}`,
    targetUsdPerKg,
    bullets: insights.rationaleBullets,
  });
  const [message, setMessage] = useState<string>(defaultMessage);
  const [target, setTarget] = useState<string>(targetUsdPerKg);
  const [channel, setChannel] = useState<"email" | "whatsapp">((v.primaryContact?.preferredChannel as "email" | "whatsapp") ?? "email");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/negotiate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, channel, targetUsdPerKg: parseFloat(target) }),
      });
      if (r.ok) { onSent(); }
      else toast.error("Send failed");
    } finally { setSending(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <div className="label-caps mb-2">Negotiation insights</div>
          <ul className="space-y-1.5 text-sm">
            {insights.rationaleBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle size={13} weight="fill" className="text-lime-500 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="label-caps mb-2">Your target</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-forest-500">$</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-24 rounded-md border border-forest-100/60 bg-white/80 px-2 py-1 text-sm tabular-nums"
              />
              <span className="text-forest-500">/kg landed</span>
            </div>
            <span className="text-xs text-forest-500">Suggested ${targetUsdPerKg} based on insights above</span>
          </div>
        </Card>
        <Card>
          <div className="label-caps mb-2">Message draft</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={9}
            className="w-full rounded-lg border border-forest-100/60 bg-white/80 px-3 py-2 text-sm font-mono"
          />
          <p className="text-[11px] text-forest-500 mt-2">Tone is calm and decisive. Edit freely — the placeholders are already filled.</p>
        </Card>
      </div>
      <div className="space-y-3">
        <Card>
          <div className="label-caps mb-2">Send via</div>
          <div className="space-y-1.5">
            {(["email", "whatsapp"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} />
                <span className="text-sm capitalize">{c}</span>
                {c === v.primaryContact?.preferredChannel && <span className="text-[10px] text-forest-500">(preferred)</span>}
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs text-forest-500">
            To: <span className="text-forest-700">{channel === "email" ? v.primaryContact?.email ?? "—" : v.primaryContact?.whatsapp ?? "—"}</span>
          </div>
        </Card>
        <Button variant="secondary" onClick={send} disabled={sending} className="w-full justify-center">
          <PaperPlaneTilt size={14} /> {sending ? "Sending…" : "Send (mock)"}
        </Button>
        <p className="text-[11px] text-forest-500">In production, this routes through the channel&apos;s adapter. In demo mode it logs and updates the opportunity stage.</p>
      </div>
    </div>
  );
}

function buildNegotiationMessage({ vendorName, productName, currentPrice, targetUsdPerKg, bullets }: {
  vendorName: string; productName: string; currentPrice: string; targetUsdPerKg: string; bullets: string[];
}): string {
  const points = bullets.slice(0, 2).map((b) => `• ${b}`).join("\n");
  return `Hi ${vendorName.split(" ")[0]},

Thanks for your offer on ${productName} at ${currentPrice}.

Looking at recent market prints we're seeing room to come in closer to $${targetUsdPerKg}/kg landed. Two factors driving our ask:

${points}

Could you take another look and confirm? Happy to discuss volume or payment-term flex if it helps you get there.

Best`;
}

function GeneratePoTab({ opportunityId, vendor: v, product: p, quote: q, orgDefaults, existingPoId, onPoCreated, onPoSent }: {
  opportunityId: string; vendor: Vendor; product: Product | null; quote: Quote;
  orgDefaults: { homePort: string; homeCurrency: string; orgName: string };
  existingPoId: string | null;
  onPoCreated: () => void; onPoSent: () => void;
}) {
  const [initNow] = useState(() => Date.now());
  const today = new Date(initNow).toISOString().slice(0, 10);
  const deliveryDefault = q.leadTimeDays ? new Date(initNow + q.leadTimeDays * 86_400_000).toISOString().slice(0, 10) : "";
  const [poNumber, setPoNumber] = useState<string>(`PO-${initNow.toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState<string>(today);
  const [deliveryDate, setDeliveryDate] = useState<string>(deliveryDefault);
  const [destPort, setDestPort] = useState<string>(orgDefaults.homePort);
  const [paymentTerms, setPaymentTerms] = useState<string>(q.paymentTerms ?? "30/70");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<Array<{ product: string; qty: string; unit: string; unitPrice: string; packaging: string }>>([
    { product: p?.name ?? "—", qty: "1", unit: q.unit, unitPrice: (q.unitPriceMinor / 100).toFixed(2), packaging: q.packaging ?? "" },
  ]);
  const [channel, setChannel] = useState<"email" | "whatsapp">((v.primaryContact?.preferredChannel as "email" | "whatsapp") ?? "email");
  const [sendMessage, setSendMessage] = useState<string>(`Hi ${v.name.split(" ")[0]},\n\nPlease find attached our PO ${"<auto>"} for ${p?.name ?? "the product"}. Acknowledgment with shipping schedule appreciated.\n\nThanks`);
  const [savedPoId, setSavedPoId] = useState<string | null>(existingPoId);
  const [busy, setBusy] = useState<string | null>(null);

  function updateLine(i: number, patch: Partial<(typeof lines)[number]>) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function addLine() {
    setLines((prev) => [...prev, { product: "", qty: "1", unit: "kg", unitPrice: "0.00", packaging: "" }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalUsd = lines.reduce((acc, l) => acc + parseFloat(l.qty || "0") * parseFloat(l.unitPrice || "0"), 0);

  async function saveDraft() {
    setBusy("save");
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/po`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poNumber, issueDate, deliveryDate, destPort, paymentTerms, notes, lines,
          currency: q.currency, vendorId: v.id, quoteId: q.id, productId: p?.id ?? null,
        }),
      });
      if (!r.ok) { toast.error("Save failed"); return; }
      const data = await r.json();
      setSavedPoId(data.id);
      toast.success("PO draft saved");
      onPoCreated();
    } finally { setBusy(null); }
  }

  function printPo() {
    if (!savedPoId) {
      toast.error("Save the draft first, then print.");
      return;
    }
    window.open(`/po/${savedPoId}/print`, "_blank");
  }

  async function sendPo() {
    if (!savedPoId) {
      await saveDraft();
    }
    setBusy("send");
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/po/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, message: sendMessage, poId: savedPoId }),
      });
      if (!r.ok) { toast.error("Send failed"); return; }
      toast.success(`PO sent via ${channel} (mock)`);
      onPoSent();
    } finally { setBusy(null); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="PO number" value={poNumber} onChange={setPoNumber} />
            <Field label="Issue date" value={issueDate} onChange={setIssueDate} type="date" />
            <Field label="Delivery date" value={deliveryDate} onChange={setDeliveryDate} type="date" />
            <Field label="Destination port" value={destPort} onChange={setDestPort} />
            <Field label="Payment terms" value={paymentTerms} onChange={setPaymentTerms} />
            <Field label="Currency" value={q.currency} onChange={() => {}} disabled />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="label-caps">Lines</div>
            <Button variant="ghost" onClick={addLine}>+ Add line</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-forest-500">
              <tr>
                <th className="text-left p-1">Product</th>
                <th className="text-right p-1">Qty</th>
                <th className="text-left p-1">Unit</th>
                <th className="text-right p-1">Unit price</th>
                <th className="text-left p-1">Packaging</th>
                <th className="text-right p-1">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const total = parseFloat(l.qty || "0") * parseFloat(l.unitPrice || "0");
                return (
                  <tr key={i} className="border-t border-forest-100/30">
                    <td className="p-1"><CellInput value={l.product} onChange={(val) => updateLine(i, { product: val })} /></td>
                    <td className="p-1"><CellInput value={l.qty} onChange={(val) => updateLine(i, { qty: val })} align="right" /></td>
                    <td className="p-1"><CellInput value={l.unit} onChange={(val) => updateLine(i, { unit: val })} /></td>
                    <td className="p-1"><CellInput value={l.unitPrice} onChange={(val) => updateLine(i, { unitPrice: val })} align="right" /></td>
                    <td className="p-1"><CellInput value={l.packaging} onChange={(val) => updateLine(i, { packaging: val })} /></td>
                    <td className="p-1 text-right tabular-nums">{q.currency} {total.toFixed(2)}</td>
                    <td className="p-1"><button onClick={() => removeLine(i)} className="text-forest-500 hover:text-red-700 text-xs">×</button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-forest-100/30">
                <td colSpan={5} className="p-1 text-right font-medium">Total</td>
                <td className="p-1 text-right font-medium tabular-nums">{q.currency} {totalUsd.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </Card>
        <Card>
          <div className="label-caps mb-1">Notes / instructions to vendor</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-forest-100/60 bg-white/80 px-3 py-2 text-sm"
            placeholder="Special instructions on packaging, documentation, dispatch window…"
          />
        </Card>
        <Card>
          <div className="label-caps mb-2">Send PO</div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {(["email", "whatsapp"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="po-channel" checked={channel === c} onChange={() => setChannel(c)} />
                <span className="capitalize">{c}</span>
                {c === v.primaryContact?.preferredChannel && <span className="text-[10px] text-forest-500">(preferred)</span>}
              </label>
            ))}
            <span className="text-xs text-forest-500">
              To: <span className="text-forest-700">{channel === "email" ? v.primaryContact?.email ?? "—" : v.primaryContact?.whatsapp ?? "—"}</span>
            </span>
          </div>
          <textarea
            value={sendMessage}
            onChange={(e) => setSendMessage(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-forest-100/60 bg-white/80 px-3 py-2 text-sm"
          />
        </Card>
      </div>
      <div className="space-y-3">
        <Card>
          <div className="label-caps mb-2">Vendor</div>
          <div className="font-medium">{v.name}</div>
          <div className="text-xs text-forest-500">{v.country}</div>
          {v.primaryContact && (
            <div className="mt-2 text-sm">
              <div>{v.primaryContact.name}</div>
              {v.primaryContact.email && <div className="text-xs text-forest-500 break-all">{v.primaryContact.email}</div>}
              {v.primaryContact.whatsapp && <div className="text-xs text-forest-500">{v.primaryContact.whatsapp}</div>}
            </div>
          )}
        </Card>
        <Card>
          <div className="label-caps mb-2">Buyer</div>
          <div className="font-medium">{orgDefaults.orgName}</div>
          <div className="text-xs text-forest-500">{orgDefaults.homePort} · {orgDefaults.homeCurrency}</div>
        </Card>
        <Button variant="secondary" onClick={saveDraft} disabled={busy !== null} className="w-full justify-center">
          {busy === "save" ? "Saving…" : savedPoId ? "Update draft" : "Save draft"}
        </Button>
        <Button variant="ghost" onClick={printPo} disabled={!savedPoId} className="w-full justify-center">
          <Printer size={14}/> Print / Save as PDF
        </Button>
        <Button variant="primary" onClick={sendPo} disabled={busy !== null} className="w-full justify-center">
          <PaperPlaneTilt size={14}/> {busy === "send" ? "Sending…" : "Send PO (mock)"}
        </Button>
        <p className="text-[11px] text-forest-500">Print opens a clean PO page in a new tab — use the browser&apos;s &ldquo;Save as PDF&rdquo;.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-[10px] label-caps mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-forest-100/60 bg-white/80 px-2 py-1.5 text-sm disabled:opacity-60"
      />
    </label>
  );
}
function CellInput({ value, onChange, align = "left" }: { value: string; onChange: (v: string) => void; align?: "left" | "right" }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={"w-full rounded-md border border-transparent bg-white/40 hover:bg-white px-1.5 py-1 text-xs tabular-nums " + (align === "right" ? "text-right" : "")}
    />
  );
}
