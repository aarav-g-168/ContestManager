import { eq, lt } from "drizzle-orm";
import { getDatabase } from "./db";
import { workerRuns } from "./db/schema";
import { processReminderQueue } from "./reminderQueue";

export async function runRecoveryWorker() {
  const db = getDatabase();
  let id: string | undefined;
  try {
    id = (await db.insert(workerRuns).values({}).returning({ id: workerRuns.id }))[0].id;
  } catch { console.error("Recovery telemetry unavailable"); }
  try {
    const stats = await processReminderQueue();
    if (id) await db.update(workerRuns).set({ ...stats, success: true, finishedAt: new Date() }).where(eq(workerRuns.id, id)).catch(() => { console.error("Recovery telemetry write failed"); });
    // Keep at most 30 days of operational telemetry on the free plan.
    await db.delete(workerRuns).where(lt(workerRuns.startedAt, new Date(Date.now() - 30 * 86400000))).catch(() => {});
    return stats;
  } catch (error) {
    if (id) await db.update(workerRuns).set({ success: false, finishedAt: new Date() }).where(eq(workerRuns.id, id)).catch(() => {});
    throw error;
  }
}
