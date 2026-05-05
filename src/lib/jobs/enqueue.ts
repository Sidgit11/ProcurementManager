import { db } from "../db/client";
import { extractionJob } from "../db/schema";

export async function enqueueChatExportJob(orgId: string, blobUrl: string, total: number) {
  const [row] = await db.insert(extractionJob).values({
    orgId,
    kind: "chat-export",
    inputRef: blobUrl,
    total,
  }).returning();
  return row;
}
