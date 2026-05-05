import { db } from "@/lib/db/client";
import { notification } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";

export default async function Notifications() {
  const o = await currentOrg();
  const rows = await db.select().from(notification).where(eq(notification.orgId, o.id)).orderBy(desc(notification.createdAt)).limit(100);

  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Notifications</h1>
      {rows.length === 0 && <p className="text-sm text-forest-500">No notifications yet.</p>}
      {rows.map((n) => (
        <Card key={n.id}>
          <div className="text-sm">{n.kind}</div>
          <pre className="mt-2 text-xs">{JSON.stringify(n.payload, null, 2)}</pre>
        </Card>
      ))}
    </div>
  );
}
