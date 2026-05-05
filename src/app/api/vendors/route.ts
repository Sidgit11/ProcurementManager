import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendor } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
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
