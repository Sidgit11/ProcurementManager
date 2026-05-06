import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { rfqTemplate } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function GET() {
  const o = await currentOrg();
  const rows = await db.select().from(rfqTemplate).where(eq(rfqTemplate.orgId, o.id)).orderBy(asc(rfqTemplate.category), asc(rfqTemplate.name));
  return NextResponse.json(rows);
}
