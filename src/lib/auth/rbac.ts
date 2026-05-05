import { currentUser } from "./current";

export type Role = "owner" | "buyer" | "viewer";

export async function requireRole(allowed: Role[]) {
  const u = await currentUser();
  if (!allowed.includes(u.role as Role)) throw new Error("forbidden");
  return u;
}
