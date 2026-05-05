import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db/client";
import { document } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { extractDocumentMetadata } from "@/lib/vault/extract";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(document).where(eq(document.vendorId, id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await currentOrg();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let blobUrl = "local://" + Date.now() + "-" + file.name;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`vault/${id}/${Date.now()}-${file.name}`, buf, {
      access: "public",
      contentType: file.type,
    });
    blobUrl = blob.url;
  }

  const meta =
    file.type.startsWith("image/") || file.type === "application/pdf"
      ? await extractDocumentMetadata(blobUrl)
      : { kind: "other" as const, issuer: null, valid_until: null, key_attributes: {} };

  const [row] = await db
    .insert(document)
    .values({
      orgId: o.id,
      vendorId: id,
      kind: meta.kind,
      blobUrl,
      filename: file.name,
      visionExtractedMetadata: meta as unknown as Record<string, unknown>,
    })
    .returning();
  return NextResponse.json(row);
}

export const runtime = "nodejs";
