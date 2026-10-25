import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  deliveries,
  reminders,
  users,
  accountPreferences,
  requestBuckets,
} from "@/lib/db/schema";
import type { Contest } from "@/features/contests/types";
import { parseAsUTC } from "@/lib/date";
import { ProfileRequestError } from "@/lib/http/request-error";
import {
  isReminderType,
  reminderOffset,
} from "@/features/reminders/lib/timing";

export async function saveReminder(
  db: Database,
  uid: string,
  email: string,
  contest: Contest,
  type: string,
  now = new Date(),
) {
  if (!isReminderType(type))
    throw new ProfileRequestError("Choose a valid reminder time.", 400);
  const start = parseAsUTC(contest.start);
  const dueAt = new Date(start.getTime() - reminderOffset(type));
  if (dueAt <= now)
    throw new ProfileRequestError(
      "That reminder time has passed. Choose a shorter reminder.",
      400,
    );
  return db.transaction(async (tx) => {
    // Lock the owner, including first inserts, to serialize changes from multiple tabs.
    const [owner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, uid))
      .for("update");
    if (!owner)
      throw new ProfileRequestError(
        "Sign in again before saving a reminder.",
        401,
      );
    const [state] = await tx
      .select({ state: users.accountState })
      .from(users)
      .where(eq(users.id, uid));
    const [prefs] = await tx
      .select()
      .from(accountPreferences)
      .where(eq(accountPreferences.userId, uid));
    if (state.state !== "active" || prefs?.remindersPaused)
      throw new ProfileRequestError(
        "Email reminders are paused. Open Account settings to resume them.",
        423,
      );
    const [existing] = await tx
      .select({ delivery: deliveries })
      .from(reminders)
      .innerJoin(deliveries, eq(reminders.deliveryId, deliveries.id))
      .where(
        and(eq(reminders.userId, uid), eq(reminders.contestId, contest.id)),
      );
    if (
      existing &&
      existing.delivery.reminderType === type &&
      existing.delivery.dueAt.getTime() === dueAt.getTime() &&
      ["pending", "scheduled"].includes(existing.delivery.status)
    )
      return {
        id: existing.delivery.id,
        previous: existing.delivery.replacesDeliveryId,
      };
    // Serialize the shared beta budget across server instances; cancellations do
    // not refund creation slots, preventing create/cancel quota abuse.
    await tx
      .insert(requestBuckets)
      .values({
        key: "reminder-budget-lock",
        count: 0,
        expiresAt: new Date(now.getTime() + 86400000),
      })
      .onConflictDoUpdate({
        target: requestBuckets.key,
        set: { expiresAt: new Date(now.getTime() + 86400000) },
      });
    const [usage] = await tx
      .select({
        own: sql<number>`count(*) filter(where ${deliveries.userId}=${uid})::int`,
        all: sql<number>`count(*)::int`,
      })
      .from(deliveries)
      .where(
        sql`${deliveries.createdAt} >= ${new Date(now.getTime() - 86400000)} and ${deliveries.createdAt} <= ${now}`,
      );
    const [scheduled] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveries)
      .where(
        sql`(${deliveries.dueAt} at time zone 'UTC')::date = (${dueAt}::timestamptz at time zone 'UTC')::date and ${deliveries.status} not in ('cancelled','expired','failed')`,
      );
    if (usage.own >= 20 || usage.all >= 80 || scheduled.count >= 80)
      throw new ProfileRequestError(
        "The reminder safety limit has been reached. Try again later or use Google Calendar.",
        429,
        { "Retry-After": "3600" },
      );
    if (existing)
      await tx
        .update(deliveries)
        .set({ cancelRequested: true, nextAttemptAt: now })
        .where(eq(deliveries.id, existing.delivery.id));
    // An earlier DELETE may still be cancelling its provider email. Chain a new
    // reminder behind it too, rather than allowing a rapid remove/re-add to race.
    const [old] = existing
      ? [existing.delivery]
      : await tx
          .select()
          .from(deliveries)
          .where(
            and(
              eq(deliveries.userId, uid),
              eq(deliveries.contestId, contest.id),
              eq(deliveries.cancelRequested, true),
            ),
          )
          .orderBy(sql`${deliveries.createdAt} desc`)
          .limit(1);
    const [delivery] = await tx
      .insert(deliveries)
      .values({
        userId: uid,
        contestId: contest.id,
        reminderType: type,
        email,
        event: contest.event,
        href: contest.href,
        contestStart: start,
        dueAt,
        replacesDeliveryId: old?.id ?? null,
      })
      .returning();
    await tx
      .insert(reminders)
      .values({ userId: uid, contestId: contest.id, deliveryId: delivery.id })
      .onConflictDoUpdate({
        target: [reminders.userId, reminders.contestId],
        set: { deliveryId: delivery.id },
      });
    return { id: delivery.id, previous: old?.id ?? null };
  });
}
export async function cancelReminder(
  db: Database,
  uid: string,
  contestId: number,
) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, uid))
      .for("update");
    const [old] = await tx
      .delete(reminders)
      .where(and(eq(reminders.userId, uid), eq(reminders.contestId, contestId)))
      .returning();
    if (old)
      await tx
        .update(deliveries)
        .set({ cancelRequested: true, nextAttemptAt: new Date() })
        .where(eq(deliveries.id, old.deliveryId));
    return old?.deliveryId;
  });
}
