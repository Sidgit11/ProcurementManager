import { db } from "@/lib/db/client";
import { purchaseOrder, vendor } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function POPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [po] = await db.select().from(purchaseOrder).where(eq(purchaseOrder.id, id));
  if (!po) return <div className="text-sm text-forest-500">PO not found.</div>;
  const [v] = await db.select().from(vendor).where(eq(vendor.id, po.vendorId));
  const lines = (po.linesJson ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Purchase Order {po.id.slice(0, 8)}</h1>
        <Pill label={po.status.toUpperCase()} />
      </div>
      <div className="text-sm text-forest-500">Vendor: {v?.name ?? "—"}</div>
      <Card>
        <div className="label-caps mb-2">Lines</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-forest-500">
            <tr><th className="text-left">Product</th><th className="text-left">Incoterm</th><th className="text-right">Price</th></tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-forest-100/30">
                <td className="py-1.5">{String(l.product ?? "—")}</td>
                <td>{String(l.incoterm ?? "—")}</td>
                <td className="text-right">
                  {String(l.currency ?? "")} {l.unitPriceMinor != null ? (Number(l.unitPriceMinor) / 100).toFixed(2) : "—"}/{String(l.unit ?? "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
