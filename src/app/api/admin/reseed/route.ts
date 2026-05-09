import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 500 });
  if (req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

  // Reset cached db client so next query hits a fresh pool
  delete (globalThis as { __tp_db_promise__?: unknown; __tp_db__?: unknown }).__tp_db_promise__;
  delete (globalThis as { __tp_db_promise__?: unknown; __tp_db__?: unknown }).__tp_db__;

  const { seedPolico } = await import("@/lib/seed/polico");
  await seedPolico();

  return NextResponse.json({ ok: true, message: "reset + seeded" });
}
