import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buyOpportunity, eventLog } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await currentOrg();
  const { id } = await params;
  const body = await req.json() as { status: string };
  const [existing] = await db.select().from(buyOpportunity).where(and(eq(buyOpportunity.id, id), eq(buyOpportunity.orgId, o.id)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.update(buyOpportunity).set({ status: body.status }).where(eq(buyOpportunity.id, id));
  await db.insert(eventLog).values({
    orgId: o.id, kind: "opportunity.status_changed",
    payload: { opportunityId: id, from: existing.status, to: body.status },
  });
  return NextResponse.json({ ok: true });
}
