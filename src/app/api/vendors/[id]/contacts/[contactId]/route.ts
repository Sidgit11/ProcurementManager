import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendorContact } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const { id, contactId } = await params;
  const body = await req.json();
  const [row] = await db.update(vendorContact)
    .set({
      name: body.name ?? undefined,
      role: body.role ?? undefined,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      whatsapp: body.whatsapp ?? undefined,
      isPrimary: body.isPrimary ?? undefined,
      preferredChannel: body.preferredChannel ?? undefined,
      language: body.language ?? undefined,
      notes: body.notes ?? undefined,
    })
    .where(and(eq(vendorContact.vendorId, id), eq(vendorContact.id, contactId)))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const { id, contactId } = await params;
  await db.delete(vendorContact).where(and(eq(vendorContact.vendorId, id), eq(vendorContact.id, contactId)));
  return NextResponse.json({ ok: true });
}
