"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";

interface Row {
  id: string;
  sku: string;
  name: string;
  category: string;
  quoteCount: number;
  vendorCount: number;
  avgLandedMicros: number | null;
  bestLandedMicros: number | null;
}

function fmt(micros: number | null): string {
  if (micros == null) return "—";
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export function CompareTable({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "name", header: "Product", accessor: (r) => r.name,
      render: (r) => <Link href={`/compare/${r.sku}`} className="hover:underline">{r.name}</Link>,
    },
    { key: "category", header: "Category", accessor: (r) => r.category, filterable: true },
    { key: "vendorCount", header: "Vendors", accessor: (r) => r.vendorCount, align: "right" },
    { key: "quoteCount", header: "Quotes", accessor: (r) => r.quoteCount, align: "right" },
    {
      key: "bestLandedMicros", header: "Best landed", accessor: (r) => r.bestLandedMicros,
      align: "right",
      render: (r) => <span className="text-forest-700 font-medium">{fmt(r.bestLandedMicros)}</span>,
    },
    {
      key: "avgLandedMicros", header: "Avg landed", accessor: (r) => r.avgLandedMicros,
      align: "right",
      render: (r) => <span className="text-forest-500">{fmt(r.avgLandedMicros)}</span>,
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchKeys={["name", "sku", "category"]}
      searchPlaceholder="Search SKU, product, or category"
      emptyState="No products match your filters."
    />
  );
}
