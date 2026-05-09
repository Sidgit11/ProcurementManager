import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendor } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET() {
  const o = await currentOrg();
  const rows = await db
    .select({ id: vendor.id, name: vendor.name, country: vendor.country })
    .from(vendor)
    .where(eq(vendor.orgId, o.id))
    .orderBy(asc(vendor.name));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const o = await currentOrg();
  const body = await req.json() as { name: string; country?: string; channelsDetected?: string[]; primaryContact?: string };
  // De-dup by name within the same org
  const [existing] = await db.select().from(vendor).where(and(eq(vendor.orgId, o.id), eq(vendor.name, body.name)));
  if (existing) return NextResponse.json(existing);
  const [created] = await db.insert(vendor).values({
    orgId: o.id,
    name: body.name,
    country: body.country ?? null,
    primaryContact: body.primaryContact ?? null,
    channelsDetected: body.channelsDetected ?? [],
  }).returning();
  return NextResponse.json(created);
}
