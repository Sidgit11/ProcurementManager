import { db } from "@/lib/db/client";
import { purchaseOrder, vendor, vendorContact, org } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export default async function PoPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await currentOrg();
  const [po] = await db.select().from(purchaseOrder).where(eq(purchaseOrder.id, id));
  if (!po) return <div className="p-8">PO not found.</div>;
  const [v] = await db.select().from(vendor).where(eq(vendor.id, po.vendorId));
  const [c] = await db.select().from(vendorContact).where(eq(vendorContact.vendorId, po.vendorId)).orderBy(desc(vendorContact.isPrimary)).limit(1);
  const [orgRow] = await db.select().from(org).where(eq(org.id, o.id));
  const h = (po.headerJson ?? {}) as Record<string, unknown>;
  const lines = (po.linesJson ?? []) as Array<Record<string, unknown>>;
  const total = lines.reduce((acc, l) => acc + (parseFloat(String(l.qty ?? "0")) * parseFloat(String(l.unitPrice ?? "0"))), 0);
  const currency = String(h.currency ?? "USD");

  return (
    <div className="bg-white text-forest-700 p-10 max-w-3xl mx-auto print:p-0 print:max-w-none">
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print mb-4 flex items-center justify-between">
        <button onClick={() => history.back()} className="text-xs text-forest-500 hover:underline">← Back</button>
        <button onClick={() => window.print()} className="rounded-md bg-forest-700 text-white px-3 py-1.5 text-sm">Print / Save as PDF</button>
      </div>
      <div className="border-b border-forest-700 pb-4 mb-6 flex justify-between items-end">
        <div>
          <div className="text-3xl font-display font-semibold">PURCHASE ORDER</div>
          <div className="text-sm text-forest-500 mt-1">{String(h.poNumber ?? "—")}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-display">{orgRow?.name ?? "—"}</div>
          <div className="text-sm text-forest-500">{orgRow?.homePort ?? ""}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <div className="text-[10px] label-caps mb-1">Vendor</div>
          <div className="font-medium">{v?.name}</div>
          {c && (
            <>
              <div>{c.name}</div>
              {c.email && <div className="text-forest-500">{c.email}</div>}
              {c.phone && <div className="text-forest-500">{c.phone}</div>}
            </>
          )}
          <div className="text-forest-500">{v?.country}</div>
        </div>
        <div>
          <div className="text-[10px] label-caps mb-1">Buyer</div>
          <div className="font-medium">{orgRow?.name}</div>
          <div className="text-forest-500">Destination: {String(h.destPort ?? "—")}</div>
        </div>
        <div>
          <div className="text-[10px] label-caps mb-1">Issue date</div>
          <div>{String(h.issueDate ?? "—")}</div>
        </div>
        <div>
          <div className="text-[10px] label-caps mb-1">Delivery date</div>
          <div>{String(h.deliveryDate ?? "—")}</div>
        </div>
        <div>
          <div className="text-[10px] label-caps mb-1">Payment terms</div>
          <div>{String(h.paymentTerms ?? "—")}</div>
        </div>
        <div>
          <div className="text-[10px] label-caps mb-1">Currency</div>
          <div>{currency}</div>
        </div>
      </div>
      <table className="w-full text-sm mb-6">
        <thead className="border-y border-forest-700">
          <tr>
            <th className="text-left py-1.5">Product</th>
            <th className="text-right py-1.5">Qty</th>
            <th className="text-left py-1.5">Unit</th>
            <th className="text-right py-1.5">Unit price</th>
            <th className="text-left py-1.5">Packaging</th>
            <th className="text-right py-1.5">Line total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const t = parseFloat(String(l.qty ?? "0")) * parseFloat(String(l.unitPrice ?? "0"));
            return (
              <tr key={i} className="border-b border-forest-100/60">
                <td className="py-1.5">{String(l.product ?? "—")}</td>
                <td className="text-right tabular-nums">{String(l.qty ?? "—")}</td>
                <td>{String(l.unit ?? "—")}</td>
                <td className="text-right tabular-nums">{currency} {parseFloat(String(l.unitPrice ?? "0")).toFixed(2)}</td>
                <td>{String(l.packaging ?? "—")}</td>
                <td className="text-right tabular-nums">{currency} {t.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="text-right pt-3 font-semibold">Total</td>
            <td className="text-right pt-3 font-semibold tabular-nums">{currency} {total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      {h.notes ? (
        <div className="text-sm">
          <div className="text-[10px] label-caps mb-1">Notes</div>
          <div className="whitespace-pre-wrap text-forest-700">{String(h.notes)}</div>
        </div>
      ) : null}
      <div className="text-xs text-forest-500 mt-12 pt-6 border-t border-forest-100/60">
        This purchase order is computer-generated by Tradyon Procurement. Acknowledgment with shipping schedule appreciated.
      </div>
    </div>
  );
}
