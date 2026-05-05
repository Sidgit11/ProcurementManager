export type AgentName = "daily_summary" | "follow_up" | "negotiation" | "buy_now" | "vendor_discovery";

export interface AgentPolicy {
  agentName: AgentName;
  enabled: boolean;
  guardrails: Record<string, number | string | boolean>;
  autoExecute: boolean;
}

export const DEFAULT_POLICIES: Record<AgentName, AgentPolicy> = {
  daily_summary:    { agentName: "daily_summary",    enabled: true,  guardrails: {},                                                   autoExecute: true  },
  follow_up:        { agentName: "follow_up",        enabled: false, guardrails: { minCadenceDays: 3, maxNudges: 3 },                  autoExecute: false },
  negotiation:      { agentName: "negotiation",      enabled: false, guardrails: { maxCounterPct: 15, minCounterPct: 0.5 },            autoExecute: false },
  buy_now:          { agentName: "buy_now",          enabled: true,  guardrails: { minScore: 0.04 },                                   autoExecute: false },
  vendor_discovery: { agentName: "vendor_discovery", enabled: false, guardrails: {},                                                   autoExecute: false },
};
