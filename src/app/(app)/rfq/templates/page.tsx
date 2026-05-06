import { db } from "@/lib/db/client";
import { rfqTemplate } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const CAT_LABELS: Record<string, string> = {
  price_inquiry: "Price inquiry",
  negotiation: "Negotiation",
  documents: "Documents",
};

export default async function TemplatesPage() {
  const o = await currentOrg();
  const templates = await db.select().from(rfqTemplate).where(eq(rfqTemplate.orgId, o.id)).orderBy(asc(rfqTemplate.category), asc(rfqTemplate.name));
  const grouped: Record<string, typeof templates> = {};
  for (const t of templates) {
    (grouped[t.category ?? "other"] ??= []).push(t);
  }
  return (
    <div className="space-y-4 max-w-3xl">
      <Breadcrumbs trail={[{ label: "Requests", href: "/rfq" }, { label: "Templates" }]} />
      <div>
        <div className="label-caps">RFQ templates</div>
        <h1 className="font-display text-3xl">Reusable openers and follow-ups</h1>
        <p className="mt-1 text-sm text-forest-500 max-w-2xl">
          Pre-written RFQ bodies for the three most common vendor conversations. Pick one when composing a new request — substitution placeholders like <code className="bg-forest-100/60 px-1 rounded text-[11px]">{`{product}`}</code> and <code className="bg-forest-100/60 px-1 rounded text-[11px]">{`{vendor_name}`}</code> get filled in on send.
        </p>
      </div>
      {Object.keys(grouped).map((cat) => (
        <div key={cat} className="space-y-2">
          <div className="label-caps">{CAT_LABELS[cat] ?? cat}</div>
          <div className="grid gap-2">
            {grouped[cat].map((t) => (
              <Card key={t.id}>
                <div className="font-medium text-sm">{t.name}</div>
                <div className="mt-1 text-xs text-forest-700 whitespace-pre-wrap">{t.body}</div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
