import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { deliveries, reminders, users } from "@/lib/db/schema";
import type { Contest } from "@/features/contests/types";
import { parseAsUTC } from "@/lib/date";
import { ProfileRequestError } from "@/lib/http/request-error";

export async function saveReminder(
  db: Database,
  uid: string,
  email: string,
  contest: Contest,
  type: string,
  now = new Date(),
) {
  if (!["1h", "6h", "24h"].includes(type))
    throw new ProfileRequestError("Choose a valid reminder time.", 400);
  const start = parseAsUTC(contest.start);
  const dueAt = new Date(
    start.getTime() - Number(type.replace("h", "")) * 3600000,
  );
  if (dueAt <= now)
    throw new ProfileRequestError(
      "That reminder time has passed. Choose a shorter reminder.",
      400,
    );
  return db.transaction(async (tx) => {
    // Lock the owner, including first inserts, to serialize changes from multiple tabs.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, uid))
      .for("update");
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
