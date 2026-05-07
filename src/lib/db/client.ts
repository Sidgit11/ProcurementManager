import * as schema from "./schema";

// ──────────────────────────────────────────────────────────────────────────────
// In non-demo mode, initialize Postgres synchronously at import time.
// In demo mode, initialization is async (PGlite + migrations + seed).
// ──────────────────────────────────────────────────────────────────────────────

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
type AnyDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

declare global {
  var __tp_db_promise__: Promise<AnyDb> | undefined;
  var __tp_db__: AnyDb | undefined;
}

function initNonDemo(): AnyDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema }) as AnyDb;
}

async function initDemo(): Promise<AnyDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { count } = await import("drizzle-orm");

  const client = new PGlite();
  const dbInstance = drizzlePglite(client, { schema }) as PgliteDatabase<typeof schema>;
  await migrate(dbInstance, { migrationsFolder: "./drizzle/migrations" });

  const orgCount = await dbInstance.select({ n: count() }).from(schema.org);
  if (Number(orgCount[0]?.n ?? 0) === 0) {
    const { seedDemo } = await import("../seed/demo-seed");
    await seedDemo(dbInstance);
    console.log("[demo] PGlite initialized + migrated + seeded.");
  } else {
    console.log("[demo] PGlite already seeded; reusing.");
  }
  return dbInstance;
}

if (!globalThis.__tp_db_promise__) {
  // Use real Postgres whenever DATABASE_URL is set (works for both prod and demo-on-Vercel).
  // Fall back to PGlite only for local DEMO_MODE without DATABASE_URL.
  const usePglite = process.env.DEMO_MODE === "1" && !process.env.DATABASE_URL;
  if (usePglite) {
    globalThis.__tp_db_promise__ = initDemo().then((d) => {
      globalThis.__tp_db__ = d;
      return d;
    });
  } else {
    const d = initNonDemo();
    globalThis.__tp_db__ = d;
    globalThis.__tp_db_promise__ = Promise.resolve(d);
  }
}

/** Await this to guarantee the db is initialized (required in demo mode). */
export async function getDb(): Promise<AnyDb> {
  if (globalThis.__tp_db__) return globalThis.__tp_db__;
  return globalThis.__tp_db_promise__!;
}

/**
 * Synchronous `db` proxy. Safe to use once `__tp_db__` is set.
 *
 * Non-demo: set synchronously at import time (no race condition).
 * Demo: set after async PGlite init. Call `await getDb()` (or `currentOrg()`) first.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: AnyDb = new Proxy({} as any, {
  get(_target, prop) {
    const real = globalThis.__tp_db__;
    if (!real) {
      throw new Error(
        `[db] Database not yet initialized. ` +
        (process.env.DEMO_MODE === "1"
          ? "In DEMO_MODE, call `await getDb()` or `currentOrg()` before using `db`."
          : "This is a bug — db should be initialized at import time in non-demo mode.")
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (real as any)[prop];
    if (typeof val === "function") return val.bind(real);
    return val;
  },
});

export type Db = AnyDb;
