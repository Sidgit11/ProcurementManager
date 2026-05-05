import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { provisionOrgIfMissing, provisionUserIfMissing } from "@/lib/auth/provision";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return NextResponse.json({ error: "no secret" }, { status: 500 });

  const hdrs = await headers();
  const id = hdrs.get("svix-id");
  const ts = hdrs.get("svix-timestamp");
  const sig = hdrs.get("svix-signature");
  if (!id || !ts || !sig) return NextResponse.json({ error: "missing svix headers" }, { status: 400 });

  const body = await req.text();
  const evt = new Webhook(secret).verify(body, {
    "svix-id": id,
    "svix-timestamp": ts,
    "svix-signature": sig,
  }) as { type: string; data: Record<string, unknown> };

  if (evt.type === "organization.created") {
    await provisionOrgIfMissing(evt.data.id as string, evt.data.name as string);
  } else if (evt.type === "user.created") {
    const orgId = (evt.data.organization_memberships as { organization: { id: string } }[] | undefined)?.[0]?.organization.id ?? "personal";
    const email = ((evt.data.email_addresses as { email_address: string }[] | undefined)?.[0]?.email_address) ?? "";
    const name = `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim() || email;
    await provisionUserIfMissing(evt.data.id as string, orgId, email, name);
  }

  return NextResponse.json({ ok: true });
}
