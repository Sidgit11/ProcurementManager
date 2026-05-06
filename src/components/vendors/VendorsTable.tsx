"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";

interface Row {
  id: string;
  name: string;
  country: string;
  scoreTier: string;
  quoteCount: number;
  skuCount: number;
  lastQuoteAt: string | null;
  issueCount: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", VN: "Vietnam", ID: "Indonesia", TR: "Türkiye", BR: "Brazil",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 1) return "today";
  if (days < 30) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function VendorsTable({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "name", header: "Vendor", accessor: (r) => r.name,
      render: (r) => <Link href={`/vendors/${r.id}`} className="hover:underline">{r.name}</Link>,
    },
    { key: "country", header: "Country", accessor: (r) => r.country, filterable: true,
      render: (r) => <span className="text-forest-700">{COUNTRY_NAMES[r.country] ?? r.country}</span>,
    },
    { key: "scoreTier", header: "Score", accessor: (r) => r.scoreTier, filterable: true,
      render: (r) => r.scoreTier && r.scoreTier !== "—" ? <Pill label={r.scoreTier} /> : <span className="text-forest-500">—</span>,
    },
    { key: "quoteCount", header: "Quotes", accessor: (r) => r.quoteCount, align: "right" },
    { key: "skuCount", header: "SKUs", accessor: (r) => r.skuCount, align: "right" },
    { key: "lastQuoteAt", header: "Last quote", accessor: (r) => r.lastQuoteAt ?? "",
      render: (r) => <span className="text-forest-500">{timeAgo(r.lastQuoteAt)}</span>,
    },
    { key: "issueCount", header: "Issues", accessor: (r) => r.issueCount, align: "right",
      render: (r) => r.issueCount > 0
        ? <span className="text-red-700 font-medium">{r.issueCount}</span>
        : <span className="text-forest-500">0</span>,
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchKeys={["name", "country"]}
      searchPlaceholder="Search vendors by name or country"
      emptyState="No vendors match your filters."
    />
  );
}
