import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { vendor } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";

export default async function InboxIndex() {
  const o = await currentOrg();
  const [v] = await db.select().from(vendor).where(eq(vendor.orgId, o.id)).limit(1);
  if (v) redirect(`/inbox/${v.id}`);
  return <div className="text-sm text-forest-500">No vendors yet. Upload a chat export to get started.</div>;
}
