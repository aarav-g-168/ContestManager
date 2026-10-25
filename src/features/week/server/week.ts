import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { bookmarks, contests, deliveries, reminders } from "@/lib/db/schema";
import type { WeekPlan } from "@/features/week/lib/week";
import { isSavedReminderType } from "@/features/reminders/lib/timing";
import { weekWindow } from "@/features/week/lib/week";
import { getPlannedPractice } from "@/features/journal/server/practice";

export async function getWeekPlan(
  db: Database,
  uid: string,
  now = new Date(),
): Promise<WeekPlan> {
  const window = weekWindow(now.getTime());
  const practice = await getPlannedPractice(
    db,
    uid,
    window.today,
    window.days[6].key,
  );
  const rows = await db
    .select({
      contest: {
        id: contests.id,
        event: contests.event,
        host: contests.host,
        href: contests.href,
        start: contests.start,
        duration: contests.duration,
      },
      bookmarkId: bookmarks.contestId,
      reminderType: deliveries.reminderType,
      reminderStatus: deliveries.status,
      dueAt: deliveries.dueAt,
      reminderStart: deliveries.contestStart,
    })
    .from(contests)
    .leftJoin(
      bookmarks,
      and(eq(bookmarks.contestId, contests.id), eq(bookmarks.userId, uid)),
    )
    .leftJoin(
      reminders,
      and(eq(reminders.contestId, contests.id), eq(reminders.userId, uid)),
    )
    .leftJoin(
      deliveries,
      and(eq(deliveries.id, reminders.deliveryId), eq(deliveries.userId, uid)),
    )
    .where(
      and(
        or(isNotNull(bookmarks.contestId), isNotNull(deliveries.id)),
        sql`${contests.start} + greatest(${contests.duration}, 0) * interval '1 second' > ${now}`,
      ),
    )
    .orderBy(contests.start, contests.id);
  return {
    practice,
    asOf: now.toISOString(),
    items: rows.map((row) => ({
      contest: { ...row.contest, start: row.contest.start.toISOString() },
      bookmarked: row.bookmarkId !== null,
      reminder:
        row.dueAt && row.reminderStart && isSavedReminderType(row.reminderType)
          ? {
              type: row.reminderType,
              status: row.reminderStatus ?? "unknown",
              dueAt: row.dueAt.toISOString(),
              contestStart: row.reminderStart.toISOString(),
            }
          : null,
    })),
  };
}
