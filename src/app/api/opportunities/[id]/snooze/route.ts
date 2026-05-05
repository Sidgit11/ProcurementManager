import { NextRequest, NextResponse } from "next/server";
import { db, getDb } from "@/lib/db/client";
import { buyOpportunity } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await getDb();
  const { id } = await params;
  await db.update(buyOpportunity).set({ status: "snoozed" }).where(eq(buyOpportunity.id, id));
  return NextResponse.redirect(new URL("/opportunities", req.url), { status: 303 });
}
