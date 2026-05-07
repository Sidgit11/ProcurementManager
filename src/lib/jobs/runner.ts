import { db } from "../db/client";
import { extractionJob, message } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { processMessage } from "../extraction/pipeline";
import { isDemo } from "../demo/is-demo";

export async function tickOnce(maxMessagesArg?: number): Promise<{ processed: number; jobsActive: number }> {
  const maxMessages = maxMessagesArg ?? (isDemo() ? 200 : 25);
  // Promote one pending job to running
  const pending = await db.select().from(extractionJob).where(eq(extractionJob.status, "pending")).limit(1);
  if (pending.length) {
    await db.update(extractionJob).set({ status: "running", startedAt: new Date() }).where(eq(extractionJob.id, pending[0].id));
  }

  const active = await db.select().from(extractionJob).where(eq(extractionJob.status, "running"));
  let processed = 0;
  for (const job of active) {
    const unprocessed = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.orgId, job.orgId), isNull(message.classification)))
      .limit(maxMessages);
    for (const m of unprocessed) {
      await processMessage(m.id);
      processed++;
    }
    await db.update(extractionJob)
      .set({ progress: job.progress + unprocessed.length })
      .where(eq(extractionJob.id, job.id));
    if (unprocessed.length === 0) {
      await db.update(extractionJob)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(extractionJob.id, job.id));
    }
  }
  return { processed, jobsActive: active.length };
}
