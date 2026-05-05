import { db } from "../db/client";
import { sql } from "drizzle-orm";
import { anthropic, MODELS, asCached } from "../integrations/llm";
import { recordRun } from "./runtime";

const SYS = `You produce a 4-bullet daily summary for a procurement operator. Use only the numbers given. Calm, decisive, executive. No hype. No "Our AI...". Plain text bullets only.`;

export async function runDailySummary(orgId: string) {
  const r = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM quote WHERE org_id = ${orgId} AND captured_at > now() - interval '1 day') AS new_quotes,
      (SELECT COUNT(*)::int FROM rfq   WHERE org_id = ${orgId} AND status = 'sent' AND sent_at < now() - interval '3 days') AS stale_rfqs,
      (SELECT COUNT(*)::int FROM buy_opportunity WHERE org_id = ${orgId} AND status = 'open') AS open_opportunities
  `);
  const stats = r.rows[0] as { new_quotes: number; stale_rfqs: number; open_opportunities: number };

  let summary = "";
  try {
    const m = await anthropic.messages.create({
      model: MODELS.extractor,
      max_tokens: 250,
      system: asCached(SYS),
      messages: [{ role: "user", content: JSON.stringify(stats) }],
    });
    const text = m.content.find((c) => c.type === "text");
    summary = text && "text" in text ? text.text : "";
  } catch {
    summary = `${stats.new_quotes} new quotes captured. ${stats.stale_rfqs} RFQs awaiting response. ${stats.open_opportunities} open buy opportunities.`;
  }

  return await recordRun({
    orgId,
    agentName: "daily_summary",
    proposedActions: { stats, summary },
    decision: "auto_executed",
  });
}
