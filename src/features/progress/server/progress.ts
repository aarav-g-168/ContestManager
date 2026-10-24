import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { journalEntries as journal } from "@/lib/db/schema";
import {
  aggregateProgress,
  progressWindow,
  type ProgressQuery,
  type ProgressRecord,
} from "@/features/progress/lib/progress";
export async function getProgress(
  db: Database,
  uid: string,
  query: ProgressQuery,
  now = new Date(),
) {
  const window = progressWindow(query.months, now);
  const owner = eq(journal.userId, uid);
  const [records, count, platforms, practice] = await Promise.all([
    db
      .select({
        id: journal.id,
        title: journal.title,
        host: journal.host,
        date: journal.date,
        status: sql<string>`${journal.data}->>'status'`,
        solved: sql<number | null>`(${journal.data}->>'solved')::int`,
        rank: sql<number | null>`(${journal.data}->>'rank')::int`,
        problemStates: sql<
          boolean[]
        >`coalesce((select jsonb_agg(p->'done') from jsonb_array_elements(${journal.data}->'problems') p),'[]'::jsonb)`,
        tags: sql<string[]>`${journal.data}->'tags'`,
      })
      .from(journal)
      .where(
        and(
          owner,
          gte(journal.date, window.from),
          lte(journal.date, window.to),
          query.platform ? eq(journal.host, query.platform) : undefined,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(journal)
      .where(owner),
    db
      .selectDistinct({ host: journal.host })
      .from(journal)
      .where(owner)
      .orderBy(journal.host),
    db.execute(sql`select substring(to_char((p->>'completedAt')::timestamptz at time zone 'Asia/Kolkata','YYYY-MM-DD') from 1 for 7) as month,count(*)::int as completed
      from ${journal} e cross join lateral jsonb_array_elements(e.data->'problems') p
      where e.user_id=${uid} and (${query.platform}='' or e.host=${query.platform}) and p->>'done'='true'
      and nullif(p->>'completedAt','') is not null
      and (p->>'completedAt')::timestamptz >= (${window.from}::date::timestamp at time zone 'Asia/Kolkata')
      and (p->>'completedAt')::timestamptz <= ${now}
      group by month`),
  ]);
  const snapshot = aggregateProgress(
    records as ProgressRecord[],
    query,
    now,
    count[0].count,
    platforms.map((row) => row.host),
  );
  const monthly = window.monthly.map((month) => ({
    key: month.key,
    label: month.label,
    completed: Number(
      practice.rows.find((row) => row.month === month.key)?.completed ?? 0,
    ),
  }));
  return {
    ...snapshot,
    practice: {
      completed: monthly.reduce((sum, month) => sum + month.completed, 0),
      monthly,
    },
  };
}
