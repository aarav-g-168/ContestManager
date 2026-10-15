import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import type { Database } from "./db";
import { bookmarks, contests, deliveries, reminders } from "./db/schema";
import type { WeekPlan } from "./week";

export async function getWeekPlan(
  db: Database,
  uid: string,
  now = new Date(),
): Promise<WeekPlan> {
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
    asOf: now.toISOString(),
    items: rows.map((row) => ({
      contest: { ...row.contest, start: row.contest.start.toISOString() },
      bookmarked: row.bookmarkId !== null,
      reminder:
        row.dueAt &&
        row.reminderStart &&
        ["1h", "6h", "24h"].includes(row.reminderType ?? "")
          ? {
              type: row.reminderType as "1h" | "6h" | "24h",
              status: row.reminderStatus ?? "unknown",
              dueAt: row.dueAt.toISOString(),
              contestStart: row.reminderStart.toISOString(),
            }
          : null,
    })),
  };
}
