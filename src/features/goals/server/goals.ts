import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { weeklyGoals, journalEntries } from "@/lib/db/schema";
import {
  goalWeek,
  validateGoals,
  type WeeklyGoalsSnapshot,
} from "@/features/goals/lib/goals";
import { ProfileRequestError } from "@/lib/http/request-error";

export async function getWeeklyGoals(
  db: Database,
  uid: string,
  now = new Date(),
): Promise<WeeklyGoalsSnapshot> {
  const week = goalWeek(now);
  const [targets, contests, problems] = await Promise.all([
    db
      .select()
      .from(weeklyGoals)
      .where(
        and(eq(weeklyGoals.userId, uid), eq(weeklyGoals.weekStart, week.start)),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, uid),
          sql`${journalEntries.date} >= ${week.start} and ${journalEntries.date} <= ${week.today} and ${journalEntries.data}->>'status'='participated'`,
        ),
      ),
    db.execute(sql`select count(*)::int as count from ${journalEntries} e cross join lateral jsonb_array_elements(e.data->'problems') p
      where e.user_id=${uid} and p->>'done'='true' and nullif(p->>'completedAt','') is not null
      and (p->>'completedAt')::timestamptz >= ${week.startAt}::timestamptz
      and (p->>'completedAt')::timestamptz < ${week.endAt}::timestamptz
      and (p->>'completedAt')::timestamptz <= ${now}`),
  ]);
  const row = targets[0];
  return {
    asOf: now.toISOString(),
    week,
    targets: { contests: row?.contests ?? 0, problems: row?.problems ?? 0 },
    revision: row?.revision ?? null,
    counts: {
      contests: contests[0].count,
      problems: Number(problems.rows[0].count),
    },
  };
}
export async function saveWeeklyGoals(
  db: Database,
  uid: string,
  input: unknown,
  now = new Date(),
) {
  const { weekStart, revision, contests, problems } = validateGoals(input, now);
  const rows =
    revision === null
      ? await db
          .insert(weeklyGoals)
          .values({
            userId: uid,
            weekStart,
            contests,
            problems,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .returning()
      : await db
          .update(weeklyGoals)
          .set({
            contests,
            problems,
            revision: sql`${weeklyGoals.revision}+1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(weeklyGoals.userId, uid),
              eq(weeklyGoals.weekStart, weekStart),
              eq(weeklyGoals.revision, revision),
            ),
          )
          .returning();
  if (!rows.length)
    throw new ProfileRequestError(
      "Your goals changed in another tab. Reload the latest goals before saving.",
      409,
    );
  return getWeeklyGoals(db, uid, now);
}
