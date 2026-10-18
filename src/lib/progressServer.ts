import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Database } from "./db";
import { journalEntries as journal } from "./db/schema";
import { aggregateProgress, progressWindow, type ProgressQuery, type ProgressRecord } from "./progress";
export async function getProgress(db: Database, uid: string, query: ProgressQuery, now = new Date()) {
  const window = progressWindow(query.months, now);
  const owner = eq(journal.userId, uid);
  const [records, count, platforms] = await Promise.all([
    db.select({ id: journal.id, title: journal.title, host: journal.host, date: journal.date,
      status: sql<string>`${journal.data}->>'status'`, solved: sql<number | null>`(${journal.data}->>'solved')::int`, rank: sql<number | null>`(${journal.data}->>'rank')::int`,
      problemStates: sql<boolean[]>`coalesce((select jsonb_agg(p->'done') from jsonb_array_elements(${journal.data}->'problems') p),'[]'::jsonb)`,
      tags: sql<string[]>`${journal.data}->'tags'`,
    }).from(journal).where(and(owner, gte(journal.date, window.from), lte(journal.date, window.to), query.platform ? eq(journal.host, query.platform) : undefined)),
    db.select({ count: sql<number>`count(*)::int` }).from(journal).where(owner),
    db.selectDistinct({ host: journal.host }).from(journal).where(owner).orderBy(journal.host),
  ]);
  return aggregateProgress(records as ProgressRecord[], query, now, count[0].count, platforms.map((row) => row.host));
}
