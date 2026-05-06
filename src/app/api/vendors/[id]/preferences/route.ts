import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendor } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db.update(vendor)
    .set({ preferences: body })
    .where(eq(vendor.id, id))
    .returning();
  return NextResponse.json({ preferences: row?.preferences });
}
