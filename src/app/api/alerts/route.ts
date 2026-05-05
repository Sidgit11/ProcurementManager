import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { alert } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET() {
  const o = await currentOrg();
  const rows = await db.select().from(alert).where(eq(alert.orgId, o.id)).orderBy(desc(alert.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const o = await currentOrg();
  const body = await req.json();
  const [row] = await db.insert(alert).values({
    orgId: o.id,
    kind: body.kind,
    params: body.params,
    enabled: true,
  }).returning();
  return NextResponse.json(row);
}
