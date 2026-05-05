import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { runModel, type ModelConfig, type ModelId } from "@/lib/forecast/models";

export async function POST(req: NextRequest) {
  const o = await currentOrg();
  const body = (await req.json()) as {
    sku: string;
    modelId: ModelId;
    params?: Record<string, number>;
  };

  const [p] = await db
    .select()
    .from(product)
    .where(and(eq(product.orgId, o.id), eq(product.sku, body.sku)));
  if (!p) return NextResponse.json({ error: "SKU not found" }, { status: 404 });

  const r = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM date_trunc('day', captured_at))::bigint AS day,
           AVG(landed_cost_usd_per_kg_micros)::bigint AS landed
    FROM quote
    WHERE org_id = ${o.id} AND product_id = ${p.id}
      AND captured_at > now() - interval '180 days'
      AND landed_cost_usd_per_kg_micros IS NOT NULL
    GROUP BY day
    ORDER BY day
  `);
  const days = r.rows.map((row) => ({
    day: Number((row as { day: number | string }).day),
    landed: Number((row as { landed: number | string }).landed),
  }));

  const cfg: ModelConfig = { modelId: body.modelId, ...(body.params ?? {}) };
  const result = runModel(days, cfg);

  return NextResponse.json({
    history: days,
    result,
  });
}

export const runtime = "nodejs";
