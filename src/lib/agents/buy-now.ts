import { scanForOpportunities } from "../opportunity/scan";
import { recordRun } from "./runtime";

export async function runBuyNow(orgId: string) {
  const r = await scanForOpportunities(orgId, 0.04);
  return await recordRun({
    orgId,
    agentName: "buy_now",
    proposedActions: { kind: "scan_complete", created: r.created },
    decision: "auto_executed",
  });
}
