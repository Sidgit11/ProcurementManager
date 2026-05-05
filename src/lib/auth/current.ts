import { auth } from "@clerk/nextjs/server";
import { getDb, db } from "../db/client";
import { user, org } from "../db/schema";
import { eq } from "drizzle-orm";
import { isDemo, DEMO_ORG, DEMO_USER } from "../demo/is-demo";

export async function currentOrg() {
  // Ensure DB is initialized before any query (critical for PGlite demo mode).
  await getDb();

  if (isDemo()) {
    const [o] = await db.select().from(org).where(eq(org.id, DEMO_ORG.id));
    if (o) return o;
    return DEMO_ORG; // fallback if seed hasn't run yet
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
    const [u] = await db.select().from(user).where(eq(user.id, DEMO_USER.id));
    if (u) return u;
    return DEMO_USER;
  }
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const [u] = await db.select().from(user).where(eq(user.clerkUserId, userId));
  if (!u) throw new Error("no user row — webhook may not have fired");
  return u;
}
