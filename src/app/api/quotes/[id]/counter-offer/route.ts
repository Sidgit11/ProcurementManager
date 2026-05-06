import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { quote } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { runNegotiation } from "@/lib/agents/negotiation";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await currentOrg();
  const { id } = await params;
  const [q] = await db.select().from(quote).where(and(eq(quote.id, id), eq(quote.orgId, o.id)));
  if (!q) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  // Sensible defaults: target = -3% from current, floor = -5%
  const targetPriceMinor = Math.round(Number(q.unitPriceMinor) * 0.97);
  const floorPriceMinor = Math.round(Number(q.unitPriceMinor) * 0.95);

  const run = await runNegotiation(o.id, q.id, targetPriceMinor, floorPriceMinor);
  return NextResponse.json({ runId: run.id });
}
