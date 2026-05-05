import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { extractionJob } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(extractionJob).where(eq(extractionJob.id, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}
