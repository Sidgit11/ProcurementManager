import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { rfq, rfqRecipient } from "@/lib/db/schema";
import { whatsapp } from "@/lib/integrations/whatsapp-cloud";
import { currentOrg } from "@/lib/auth/current";

export async function POST(req: NextRequest) {
  const o = await currentOrg();
  const body = await req.json();

  const [r] = await db.insert(rfq).values({
    orgId: o.id,
    productNameRaw: body.product,
    specJson: body.spec ?? {},
    status: "sent",
    sentAt: new Date(),
  }).returning();

  for (const v of body.vendorIds as string[]) {
    await whatsapp.send({ to: v, body: body.preview });
    await db.insert(rfqRecipient).values({
      rfqId: r.id,
      vendorId: v,
      channel: "whatsapp_cloud",
      preview: body.preview,
      sentAt: new Date(),
    });
  }
  return NextResponse.json({ id: r.id });
}
