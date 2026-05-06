import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendorNote } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentOrg, currentUser } from "@/lib/auth/current";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(vendorNote).where(eq(vendorNote.vendorId, id)).orderBy(desc(vendorNote.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await currentOrg();
  const u = await currentUser();
  const body = await req.json();
  const [row] = await db.insert(vendorNote).values({
    orgId: o.id,
    vendorId: id,
    authorUserId: u.id,
    body: body.body,
  }).returning();
  return NextResponse.json(row);
}
