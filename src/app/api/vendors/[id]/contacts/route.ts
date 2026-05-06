import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { vendorContact } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(vendorContact).where(eq(vendorContact.vendorId, id)).orderBy(desc(vendorContact.isPrimary), desc(vendorContact.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db.insert(vendorContact).values({
    vendorId: id,
    name: body.name,
    role: body.role ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    whatsapp: body.whatsapp ?? null,
    isPrimary: !!body.isPrimary,
    preferredChannel: body.preferredChannel ?? null,
    language: body.language ?? null,
    notes: body.notes ?? null,
  }).returning();
  return NextResponse.json(row);
}
