import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { vendor } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function InboxIndex() {
  const o = await currentOrg();
  const [v] = await db.select().from(vendor).where(eq(vendor.orgId, o.id)).limit(1);
  if (v) redirect(`/inbox/${v.id}`);

  return (
    <div className="mx-auto max-w-lg mt-12">
      <Card>
        <h2 className="font-display text-xl">Your unified vendor inbox</h2>
        <p className="mt-2 text-sm text-forest-500">
          Every email and WhatsApp thread, in one place. Voice notes get transcribed automatically.
          Quotes get extracted as inline pills under each message — one tap to see the structured data.
        </p>
        <div className="mt-4">
          <Link href="/onboarding">
            <Button variant="secondary">Upload a chat to start</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
