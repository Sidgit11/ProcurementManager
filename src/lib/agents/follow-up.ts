import { db } from "../db/client";
import { sql } from "drizzle-orm";
import { recordRun } from "./runtime";

export async function runFollowUp(orgId: string, minCadenceDays = 3, maxNudges = 3) {
  void maxNudges; // honored when nudge tracking is added; v1 just proposes
  const r = await db.execute(sql`
    SELECT r.id AS rfq_id, r.product_name_raw, rr.vendor_id, v.name AS vendor_name, rr.sent_at
    FROM rfq r
    JOIN rfq_recipient rr ON rr.rfq_id = r.id
    JOIN vendor v ON v.id = rr.vendor_id
    WHERE r.org_id = ${orgId}
      AND r.status = 'sent'
      AND rr.response_message_id IS NULL
      AND rr.sent_at < now() - interval '${sql.raw(String(minCadenceDays))} days'
    LIMIT 25
  `);

  const proposed = r.rows.map((row) => {
    const x = row as { rfq_id: string; product_name_raw: string | null; vendor_id: string; vendor_name: string; sent_at: string };
    return {
      kind: "nudge_vendor",
      rfqId: x.rfq_id,
      vendorId: x.vendor_id,
      vendorName: x.vendor_name,
      product: x.product_name_raw,
      message: `Hi — gentle follow-up on our RFQ for ${x.product_name_raw ?? "the recent inquiry"}. Could you share your latest quote? Thanks.`,
    };
  });

  return await recordRun({
    orgId,
    agentName: "follow_up",
    proposedActions: proposed,
    decision: "pending",
  });
}
