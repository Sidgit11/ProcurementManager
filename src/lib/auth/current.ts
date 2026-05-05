import { auth } from "@clerk/nextjs/server";
import { db } from "../db/client";
import { user, org } from "../db/schema";
import { eq } from "drizzle-orm";

export async function currentOrg() {
  const { userId, orgId: clerkOrgId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  if (clerkOrgId) {
    const [o] = await db.select().from(org).where(eq(org.clerkOrgId, clerkOrgId));
    if (o) return o;
  }
  // Fallback: by user
  const [u] = await db.select().from(user).where(eq(user.clerkUserId, userId));
  if (!u) throw new Error("no user row — webhook may not have fired");
  const [o] = await db.select().from(org).where(eq(org.id, u.orgId));
  if (!o) throw new Error("user has no org");
  return o;
}

export async function currentUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const [u] = await db.select().from(user).where(eq(user.clerkUserId, userId));
  if (!u) throw new Error("no user row — webhook may not have fired");
  return u;
}
