/**
 * Seed script using Neon serverless HTTP driver.
 * Use when port 5432 TCP is unreachable.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  // Override global db with neon-http drizzle instance BEFORE importing polico
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Monkey-patch the global db used by polico.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__tp_db__ = db;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__tp_db_promise__ = Promise.resolve(db);

  // Now import and run seedPolico — it will use the patched global db
  const { seedPolico } = await import("../src/lib/seed/polico");
  await seedPolico();
}

main()
  .then(() => { console.log("Seed complete."); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
