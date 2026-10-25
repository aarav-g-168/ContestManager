import { eq, lt, and } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { workerRuns, requestBuckets, accountDeletions } from "@/lib/db/schema";
import { processAccountDeletions } from "@/features/account/server/deletion";
import { processReminderQueue } from "@/features/reminders/server/queue";

export async function runRecoveryWorker() {
  const db = getDatabase();
  let id: string | undefined;
  try {
    id = (
      await db.insert(workerRuns).values({}).returning({ id: workerRuns.id })
    )[0].id;
  } catch {
    console.error("Recovery telemetry unavailable");
  }
  try {
    const started = Date.now();
    const stats = await processReminderQueue();
    if (Date.now() - started < 20000) await processAccountDeletions(db);
    if (id)
      await db
        .update(workerRuns)
        .set({ ...stats, success: true, finishedAt: new Date() })
        .where(eq(workerRuns.id, id))
        .catch(() => {
          console.error("Recovery telemetry write failed");
        });
    // Keep at most 30 days of operational telemetry on the free plan.
    await db
      .delete(workerRuns)
      .where(lt(workerRuns.startedAt, new Date(Date.now() - 30 * 86400000)))
      .catch(() => {});
    await db
      .delete(requestBuckets)
      .where(lt(requestBuckets.expiresAt, new Date(Date.now() - 86400000)))
      .catch(() => {});
    await db
      .delete(accountDeletions)
      .where(
        and(
          eq(accountDeletions.status, "complete"),
          lt(accountDeletions.expiresAt, new Date()),
        ),
      )
      .catch(() => {});
    return stats;
  } catch (error) {
    if (id)
      await db
        .update(workerRuns)
        .set({ success: false, finishedAt: new Date() })
        .where(eq(workerRuns.id, id))
        .catch(() => {});
    throw error;
  }
}
