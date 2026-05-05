import { db } from "../db/client";
import { agentRun } from "../db/schema";
import type { AgentName } from "./policy";

export async function recordRun(args: {
  orgId: string;
  agentName: AgentName;
  inputRef?: string;
  proposedActions: unknown;
  decision: "pending" | "approved" | "rejected" | "auto_executed";
}) {
  const [row] = await db.insert(agentRun).values({
    orgId: args.orgId,
    agentName: args.agentName,
    inputRef: args.inputRef,
    proposedActions: args.proposedActions as Record<string, unknown>,
    decision: args.decision,
    executedAt: args.decision === "auto_executed" ? new Date() : null,
  }).returning();
  return row;
}
