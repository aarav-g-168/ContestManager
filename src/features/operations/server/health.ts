import { desc, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { workerRuns, deliveries, accountDeletions } from "@/lib/db/schema";
export async function inspectHealth(db: Database, now = new Date()) {
  await db.execute(sql`select 1`);
  const [last] = await db
    .select({ finishedAt: workerRuns.finishedAt, success: workerRuns.success })
    .from(workerRuns)
    .orderBy(desc(workerRuns.startedAt))
    .limit(1);
  const [counts] = await db
    .select({
      overdue: sql<number>`count(*) filter(where status='pending' and due_at < ${new Date(now.getTime() - 10 * 60000)})::int`,
      attention: sql<number>`count(*) filter(where status in ('failed','bounced','uncertain') and updated_at > ${new Date(now.getTime() - 86400000)})::int`,
    })
    .from(deliveries);
  const [deletions] = await db
    .select({
      stuck: sql<number>`count(*) filter(where status='pending' and created_at < ${new Date(now.getTime() - 3600000)})::int`,
    })
    .from(accountDeletions);
  const recovery =
    !!last?.success &&
    !!last.finishedAt &&
    now.getTime() - last.finishedAt.getTime() < 15 * 60000;
  return {
    ok:
      recovery &&
      counts.overdue === 0 &&
      counts.attention === 0 &&
      deletions.stuck === 0,
    database: true,
    recovery,
    overdue: counts.overdue,
    attention: counts.attention,
    stuckDeletions: deletions.stuck,
  };
}
