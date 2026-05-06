import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET() {
  const o = await currentOrg();
  // Last 12 weeks, count of quotes per (product, week)
  const r = await db.execute(sql`
    SELECT p.sku,
           p.name,
           date_trunc('week', q.captured_at) AS week,
           COUNT(q.id)::int AS n
    FROM product p
    LEFT JOIN quote q ON q.product_id = p.id AND q.captured_at > now() - interval '12 weeks'
    WHERE p.org_id = ${o.id}
    GROUP BY p.sku, p.name, week
    ORDER BY p.name, week
  `);
  return NextResponse.json({ rows: r.rows });
}
