"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Policy {
  id: string;
  agentName: string;
  enabled: boolean;
  autoExecute: boolean;
  guardrails: Record<string, number | string | boolean>;
}

export default function AgentSettings() {
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    fetch("/api/settings/agents").then((r) => r.json()).then(setPolicies);
  }, []);

  async function update(p: Policy, patch: Partial<Policy>) {
    const r = await fetch("/api/settings/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentName: p.agentName, ...patch }),
    });
    if (r.ok) {
      const updated = (await r.json()) as Policy;
      setPolicies((prev) => prev.map((x) => x.agentName === p.agentName ? updated : x));
      toast.success("Updated");
    } else {
      toast.error("Update failed");
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Agent policies</h1>
      <div className="grid gap-3">
        {policies.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.agentName}</div>
                <div className="text-xs text-forest-500 mt-1">
                  Guardrails: {Object.keys(p.guardrails).length === 0 ? "none" : JSON.stringify(p.guardrails)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant={p.enabled ? "secondary" : "ghost"} onClick={() => update(p, { enabled: !p.enabled })}>
                  {p.enabled ? "Enabled" : "Disabled"}
                </Button>
                <Button variant={p.autoExecute ? "secondary" : "ghost"} onClick={() => update(p, { autoExecute: !p.autoExecute })}>
                  Auto: {p.autoExecute ? "on" : "off"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
