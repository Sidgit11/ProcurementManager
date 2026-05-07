import { db } from "../db/client";
import { org, user } from "../db/schema";
import { eq } from "drizzle-orm";

export async function provisionOrgIfMissing(clerkOrgId: string, name: string) {
  const [existing] = await db.select().from(org).where(eq(org.clerkOrgId, clerkOrgId));
  if (existing) return existing;
  const [created] = await db.insert(org).values({
    clerkOrgId,
    name,
    homeCurrency: "USD",
    homePort: "BR-NVT",
  }).returning();
  return created;
}

export async function provisionUserIfMissing(clerkUserId: string, clerkOrgId: string, email: string, name: string) {
  const [existing] = await db.select().from(user).where(eq(user.clerkUserId, clerkUserId));
  if (existing) return existing;
  const o = await provisionOrgIfMissing(clerkOrgId, `${name}'s Org`);
  const [created] = await db.insert(user).values({
    clerkUserId,
    orgId: o.id,
    email,
    name,
    role: "owner",
  }).returning();
  return created;
}
