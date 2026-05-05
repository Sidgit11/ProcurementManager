import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET() {
  const o = await currentOrg();
  const r = await db.execute(sql`
    SELECT p.sku, p.name, COUNT(q.id)::int AS n
    FROM product p LEFT JOIN quote q ON q.product_id = p.id
    WHERE p.org_id = ${o.id}
    GROUP BY p.sku, p.name
    ORDER BY n DESC, p.name
    LIMIT 100
  `);
  return NextResponse.json(r.rows);
}
