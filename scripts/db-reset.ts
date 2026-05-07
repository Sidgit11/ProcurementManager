import "dotenv/config";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log("Truncating all tables (RESTART IDENTITY CASCADE)...");
  // List from schema.ts. CASCADE handles dependent FKs.
  await pool.query(`
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
    RESTART IDENTITY CASCADE
  `);
  await pool.end();
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
