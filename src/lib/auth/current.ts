import { auth } from "@clerk/nextjs/server";
import { getDb, db } from "../db/client";
import { user, org } from "../db/schema";
import { eq } from "drizzle-orm";
import { isDemo, DEMO_ORG, DEMO_USER } from "../demo/is-demo";

export async function currentOrg() {
  // Ensure DB is initialized before any query (critical for PGlite demo mode).
  await getDb();

  if (isDemo()) {
    // Demo mode: try the canonical demo id first, then by clerkOrgId, then any org in the DB.
    // (The Polico production seed creates org with a random UUID — fall through to it.)
    const byId = await db.select().from(org).where(eq(org.id, DEMO_ORG.id));
    if (byId[0]) return byId[0];
    const byClerk = await db.select().from(org).where(eq(org.clerkOrgId, DEMO_ORG.clerkOrgId));
    if (byClerk[0]) return byClerk[0];
    const any = await db.select().from(org).limit(1);
    if (any[0]) return any[0];
    return DEMO_ORG;
  }
  const { userId, orgId: clerkOrgId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  if (clerkOrgId) {
    const [o] = await db.select().from(org).where(eq(org.clerkOrgId, clerkOrgId));
    if (o) return o;
  }
  const [u] = await db.select().from(user).where(eq(user.clerkUserId, userId));
  if (!u) throw new Error("no user row — webhook may not have fired");
  const [o] = await db.select().from(org).where(eq(org.id, u.orgId));
  if (!o) throw new Error("user has no org");
  return o;
}

export async function currentUser() {
  // Ensure DB is initialized before any query (critical for PGlite demo mode).
  await getDb();

  if (isDemo()) {
    const byId = await db.select().from(user).where(eq(user.id, DEMO_USER.id));
    if (byId[0]) return byId[0];
    // Fall through: any user in the seeded org
    const o = await currentOrg();
    const any = await db.select().from(user).where(eq(user.orgId, o.id)).limit(1);
    if (any[0]) return any[0];
    return DEMO_USER;
  }
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const [u] = await db.select().from(user).where(eq(user.clerkUserId, userId));
  if (!u) throw new Error("no user row — webhook may not have fired");
  return u;
}
