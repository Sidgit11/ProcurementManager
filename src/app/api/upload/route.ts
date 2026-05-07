import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { parseWhatsAppExport } from "@/lib/parsing/whatsapp-export";
import { db } from "@/lib/db/client";
import { vendor, thread, message } from "@/lib/db/schema";
import { enqueueChatExportJob } from "@/lib/jobs/enqueue";
import { eq, and } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export async function POST(req: NextRequest) {
  const o = await currentOrg();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());

  // Upload original to blob (for audit / re-extraction)
  let blobUrl = "local://" + Date.now() + "-" + file.name;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${Date.now()}-${file.name}`, buf, {
      access: "public",
      contentType: "application/zip",
    });
    blobUrl = blob.url;
  }

  // Parse the export
  const parsed = await parseWhatsAppExport(buf);

  // Find or create vendor
  let [v] = await db.select().from(vendor).where(
    and(eq(vendor.orgId, o.id), eq(vendor.name, parsed.detectedVendorName))
  );
  if (!v) {
    [v] = await db.insert(vendor).values({
      orgId: o.id,
      name: parsed.detectedVendorName,
      channelsDetected: ["whatsapp_export"],
    }).returning();
  }

  // Create thread
  const [t] = await db.insert(thread).values({
    orgId: o.id,
    vendorId: v.id,
    channel: "whatsapp_export",
    subject: `Chat with ${parsed.detectedVendorName}`,
    lastMessageAt: parsed.messages.at(-1)?.sentAt ?? new Date(),
  }).returning();

  // Insert messages
  for (const m of parsed.messages) {
    await db.insert(message).values({
      orgId: o.id,
      threadId: t.id,
      channel: "whatsapp_export",
      direction: m.sender.toLowerCase() === "you" ? "outbound" : "inbound",
      senderName: m.sender,
      body: m.body,
      sentAt: m.sentAt,
      rawSourceRef: blobUrl,
    });
  }

  // Enqueue extraction
  const job = await enqueueChatExportJob(o.id, blobUrl, parsed.messages.length);

  // In demo mode, drain the job inline before responding so the processing page
  // shows 100% immediately (no Anthropic calls — regex extraction is instant).
  if (process.env.DEMO_MODE === "1") {
    const { tickOnce } = await import("@/lib/jobs/runner");
    for (let i = 0; i < 3; i++) {
      const r = await tickOnce(200);
      if (r.processed === 0) break;
    }
  }

  return NextResponse.json({
    jobId: job.id,
    total: parsed.messages.length,
    vendorId: v.id,
    threadId: t.id,
  });
}

export const runtime = "nodejs"; // need Node APIs (Buffer, JSZip on Buffer)
