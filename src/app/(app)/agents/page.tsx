import { db } from "@/lib/db/client";
import { agentPolicy, agentRun } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function Agents() {
  const o = await currentOrg();
  const policies = await db.select().from(agentPolicy).where(eq(agentPolicy.orgId, o.id));
  const runs = await db.select().from(agentRun).where(eq(agentRun.orgId, o.id)).orderBy(desc(agentRun.createdAt)).limit(50);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Agents</h1>
      <div>
        <h2 className="font-display text-xl mb-2">Policies</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {policies.length === 0 && <p className="text-sm text-forest-500 col-span-3">No agent policies yet. Run the seed to provision defaults.</p>}
          {policies.map((p) => (
            <Card key={p.id}>
              <div className="font-medium">{p.agentName}</div>
              <Pill label={p.enabled ? "ENABLED" : "DISABLED"} />
              <div className="text-xs text-forest-500 mt-2">Auto-execute: {p.autoExecute ? "yes" : "no"}</div>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-display text-xl mb-2">Recent runs</h2>
        <div className="space-y-2">
          {runs.length === 0 && <p className="text-sm text-forest-500">No runs yet.</p>}
          {runs.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.agentName}</div>
                  <div className="text-xs text-forest-500">{r.createdAt.toISOString()}</div>
                </div>
                <Pill label={r.decision.toUpperCase()} />
              </div>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-forest-100/40 p-2 text-xs">
                {JSON.stringify(r.proposedActions, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
