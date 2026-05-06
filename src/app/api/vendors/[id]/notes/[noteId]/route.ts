import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendorNote } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await params;
  await db.delete(vendorNote).where(and(eq(vendorNote.vendorId, id), eq(vendorNote.id, noteId)));
  return NextResponse.json({ ok: true });
}
