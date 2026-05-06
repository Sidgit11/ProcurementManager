"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

interface Policy {
  id: string;
  agentName: string;
  enabled: boolean;
  autoExecute: boolean;
  guardrails: Record<string, number | string | boolean>;
}

const AGENT_NAMES: Record<string, string> = {
  daily_summary:    "Morning brief",
  follow_up:        "Follow-up drafter",
  negotiation:      "Counter-offer drafter",
  buy_now:          "Buy opportunity scanner",
  vendor_discovery: "New vendor finder",
};

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
    <div className="space-y-4">
      <div className="mb-3">
        <Breadcrumbs trail={[{ label: "Settings", href: "/settings" }, { label: "Agent policies" }]} />
      </div>
      <div>
        <h1 className="font-display text-3xl">Automation policies</h1>
        <p className="mt-1 text-sm text-forest-500">
          Toggle each automation on or off. Auto-execute means it runs without asking; off means it only proposes.
        </p>
      </div>
      <div className="grid gap-3">
        {policies.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{AGENT_NAMES[p.agentName] ?? p.agentName}</div>
                <div className="text-xs text-forest-400 mt-0.5">{p.agentName}</div>
                {Object.keys(p.guardrails).length > 0 && (
                  <div className="text-xs text-forest-400 mt-1">
                    Guardrails: {Object.entries(p.guardrails).map(([k, v]) => `${k}=${v}`).join(", ")}
                  </div>
                )}
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
