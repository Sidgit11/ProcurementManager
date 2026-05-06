"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";

interface Row {
  id: string;
  productName: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  recipientCount: number;
  respondedCount: number;
}

export function RfqTable({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "productName", header: "Request", accessor: (r) => r.productName,
      render: (r) => <Link href={`/rfq/${r.id}`} className="hover:underline">{r.productName}</Link>,
    },
    {
      key: "status", header: "Status", accessor: (r) => r.status, filterable: true,
      render: (r) => <Pill label={r.status.toUpperCase()} />,
    },
    { key: "recipientCount", header: "Sent to", accessor: (r) => r.recipientCount, align: "right" },
    {
      key: "respondedCount", header: "Replied", accessor: (r) => r.respondedCount, align: "right",
      render: (r) => (
        <span className={r.respondedCount === r.recipientCount && r.recipientCount > 0 ? "text-forest-700 font-medium" : "text-forest-500"}>
          {r.respondedCount} / {r.recipientCount}
        </span>
      ),
    },
    { key: "createdAt", header: "Created", accessor: (r) => r.createdAt,
      render: (r) => <span className="text-forest-500">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    { key: "sentAt", header: "Sent", accessor: (r) => r.sentAt ?? "",
      render: (r) => <span className="text-forest-500">{r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—"}</span>,
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      searchKeys={["productName"]}
      searchPlaceholder="Search by product or spec"
      emptyState="No requests yet. Send your first one."
    />
  );
}
