/**
 * HTTP-based DB reset using Neon's serverless HTTP driver.
 * Use when port 5432 TCP is unreachable (e.g., restricted network).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const sql = neon(process.env.DATABASE_URL);
  console.log("Truncating all tables (CASCADE)...");
  await sql`
    TRUNCATE
      "buy_opportunity", "purchase_order", "negotiation", "rfq_template", "rfq_recipient", "rfq",
      "agent_run", "agent_policy", "vendor_score", "quality_event", "vendor_note", "document",
      "alert", "notification",
      "chat_message", "chat_session",
      "price_forecast",
      "extraction_job", "event_log",
      "quote", "attachment", "message", "thread",
      "vendor_contact", "vendor",
      "product",
      "fx_rate_snapshot", "corridor_assumption",
      "user", "org"
    CASCADE
  `;
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
