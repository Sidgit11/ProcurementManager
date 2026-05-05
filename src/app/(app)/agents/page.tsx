import { db } from "@/lib/db/client";
import { agentPolicy, agentRun } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { currentOrg } from "@/lib/auth/current";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import Link from "next/link";

// ─── Human-readable metadata for each automation ────────────────────────────

const AGENT_DISPLAY: Record<string, { name: string; oneLiner: string; whatItDoes: string; cadence: string }> = {
  daily_summary: {
    name: "Morning brief",
    oneLiner: "A 4-bullet summary of what changed in your procurement overnight.",
    whatItDoes:
      "Counts new quotes captured, RFQs going stale, and open buy opportunities. Drafts a calm, decisive summary you can read in 30 seconds.",
    cadence: "Runs at 8am every day. Auto-executes. No approval needed — it's read-only.",
  },
  follow_up: {
    name: "Follow-up drafter",
    oneLiner: "Drafts gentle nudges to vendors who haven't replied to your RFQs.",
    whatItDoes:
      "Finds RFQs that have been sitting for more than 3 days without a response, then writes a one-line follow-up message in the vendor's preferred channel. Proposes them for your approval.",
    cadence: "Runs every 6 hours. Proposes only — you approve.",
  },
  negotiation: {
    name: "Counter-offer drafter",
    oneLiner: "Drafts a counter-offer when you ask, within your target/floor band.",
    whatItDoes:
      "Given a quote and your target price + floor price, drafts a respectful counter-offer message. Stays inside the bounds you set, in the vendor's tone if known.",
    cadence: "On-demand only. Proposes only — you approve.",
  },
  buy_now: {
    name: "Buy opportunity scanner",
    oneLiner: "Surfaces high-conviction buy opportunities the moment they appear.",
    whatItDoes:
      "Scores every fresh quote against the trailing median and your vendor reliability tiers. When a quote crosses the threshold, it lands on your Opportunities page with reasoning + counterfactuals.",
    cadence: "Runs every 30 minutes. Proposes only — you approve before any PO is generated.",
  },
  vendor_discovery: {
    name: "New vendor finder",
    oneLiner: "Suggests vendors you don't know yet, when your existing pool underperforms for an SKU.",
    whatItDoes:
      "Watches for SKUs where your captured quotes consistently underperform the broader market. Suggests two or three new vendors to add to your pool, with the reason they look promising.",
    cadence: "Runs daily. Proposes only — you decide whether to reach out.",
  },
};

// Default display for unknown agent names
const AGENT_DISPLAY_DEFAULT = {
  name: "Automation",
  oneLiner: "An automation that runs in the background.",
  whatItDoes: "Performs a background task according to your policy settings.",
  cadence: "Runs on schedule.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function describeRun(agentName: string, payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  if (agentName === "daily_summary") return (p.summary as string | undefined) ?? "";
  if (agentName === "buy_now") {
    const created = (p as { created?: number }).created;
    return typeof created === "number"
      ? `Surfaced ${created} buy ${created === 1 ? "opportunity" : "opportunities"}.`
      : "Scanned for buy opportunities.";
  }
  if (agentName === "follow_up" && Array.isArray(p)) {
    return `Drafted ${p.length} follow-up ${p.length === 1 ? "message" : "messages"}.`;
  }
  if (agentName === "negotiation") {
    const counter = p.counterPriceMinor as number | undefined;
    return counter != null ? `Counter-offer drafted at $${(counter / 100).toFixed(2)}.` : "Counter-offer drafted.";
  }
  if (agentName === "vendor_discovery" && Array.isArray(p)) {
    return `Suggested ${p.length} new vendor ${p.length === 1 ? "candidate" : "candidates"}.`;
  }
  return "";
}

function timeAgo(d: Date): string {
  const m = (Date.now() - d.getTime()) / 60_000;
  if (m < 1) return "just now";
  if (m < 60) return `${Math.round(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

function decisionLabel(decision: string): string {
  switch (decision) {
    case "auto_execute": return "AUTO-EXECUTED";
    case "approved":     return "APPROVED";
    case "rejected":     return "REJECTED";
    case "pending":      return "PENDING";
    default:             return decision.toUpperCase();
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AutomationsPage() {
  const o = await currentOrg();
  const policies = await db.select().from(agentPolicy).where(eq(agentPolicy.orgId, o.id));
  const runs = await db
    .select()
    .from(agentRun)
    .where(eq(agentRun.orgId, o.id))
    .orderBy(desc(agentRun.createdAt))
    .limit(10);

  // Ensure all 5 known agents appear — merge with policies or show as disabled placeholders
  const allAgentNames = Object.keys(AGENT_DISPLAY);
  const policyByName = Object.fromEntries(policies.map((p) => [p.agentName, p]));

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Page header */}
      <div>
        <div className="label-caps">AUTOMATIONS</div>
        <h1 className="font-display text-3xl mt-1">Background workflows that handle the repetitive parts</h1>
        <p className="mt-2 text-sm text-forest-500 max-w-2xl">
          Five workflows run on your behalf — drafting follow-ups, scoring buy opportunities, summarising your day.
          Each one is opt-in, policy-driven, and proposes actions for you to approve. Nothing runs autonomously without your rules.
        </p>
      </div>

      {/* Automation cards */}
      <div className="space-y-4">
        {allAgentNames.map((agentName) => {
          const display = AGENT_DISPLAY[agentName] ?? AGENT_DISPLAY_DEFAULT;
          const policy = policyByName[agentName];
          const enabled = policy?.enabled ?? false;
          const autoExec = policy?.autoExecute ?? false;

          return (
            <Card key={agentName}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Header row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display text-lg">{display.name}</span>
                    <Pill label={enabled ? "ENABLED" : "DISABLED"} />
                    <span className="text-xs text-forest-400">
                      Auto-execute: {autoExec ? "yes" : "no"}
                    </span>
                  </div>

                  {/* One-liner */}
                  <p className="text-sm text-forest-700">{display.oneLiner}</p>

                  {/* What it does */}
                  <p className="text-sm text-forest-500">{display.whatItDoes}</p>

                  {/* Cadence */}
                  <div className="inline-block">
                    <span className="label-caps rounded px-2 py-0.5 bg-lime-400/20 text-lime-700">
                      {display.cadence}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manage policy link */}
              <div className="mt-3 pt-3 border-t border-forest-100/40">
                <Link href="/settings/agents" className="text-xs text-forest-500 hover:text-forest-700">
                  Manage policy →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <div>
        <div className="label-caps mb-3">RECENT ACTIVITY</div>
        {runs.length === 0 ? (
          <p className="text-sm text-forest-500">
            No automations have run yet. Once they start, you&apos;ll see a log here.
          </p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const display = AGENT_DISPLAY[r.agentName];
              const prettyName = display?.name ?? r.agentName;
              const description = describeRun(r.agentName, r.proposedActions);

              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{prettyName}</span>
                        <span className="text-xs text-forest-400">{timeAgo(r.createdAt)}</span>
                      </div>
                      {description && (
                        <p className="mt-1 text-sm text-forest-500">{description}</p>
                      )}
                    </div>
                    <Pill label={decisionLabel(r.decision)} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
