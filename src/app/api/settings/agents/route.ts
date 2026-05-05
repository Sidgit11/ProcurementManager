import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { agentPolicy } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET() {
  const o = await currentOrg();
  const rows = await db.select().from(agentPolicy).where(eq(agentPolicy.orgId, o.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const o = await currentOrg();
  const body = await req.json() as { agentName: string; enabled?: boolean; autoExecute?: boolean; guardrails?: Record<string, unknown> };
  const [existing] = await db.select().from(agentPolicy).where(and(eq(agentPolicy.orgId, o.id), eq(agentPolicy.agentName, body.agentName)));
  if (existing) {
    const [updated] = await db.update(agentPolicy)
      .set({
        enabled: body.enabled ?? existing.enabled,
        autoExecute: body.autoExecute ?? existing.autoExecute,
        guardrails: (body.guardrails as Record<string, number | string | boolean> | undefined) ?? existing.guardrails,
      })
      .where(eq(agentPolicy.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  }
  const [created] = await db.insert(agentPolicy).values({
    orgId: o.id,
    agentName: body.agentName,
    enabled: body.enabled ?? false,
    autoExecute: body.autoExecute ?? false,
    guardrails: (body.guardrails ?? {}) as Record<string, number | string | boolean>,
  }).returning();
  return NextResponse.json(created);
}
