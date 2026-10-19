import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { getDatabase, type Database } from "@/lib/db";
import { deliveries, mailEvents } from "@/lib/db/schema";
import {
  MailError,
  resendPayload,
  resendProvider,
  type Delivery,
  type MailProvider,
} from "@/features/reminders/server/email";

const terminal = [
  "cancelled",
  "sent",
  "delivered",
  "bounced",
  "expired",
  "failed",
];
const eventStatuses: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.failed": "failed",
  "email.suppressed": "failed",
};
const rank: Record<string, number> = {
  pending: 0,
  scheduled: 0,
  sent: 1,
  delivered: 2,
  failed: 3,
  bounced: 3,
  cancelled: 4,
  expired: 4,
  uncertain: 4,
};
export async function reconcileMailEvents(db: Database, providerId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(deliveries)
      .where(eq(deliveries.providerId, providerId))
      .for("update");
    if (!row) return;
    const events = await tx
      .select()
      .from(mailEvents)
      .where(eq(mailEvents.providerId, providerId));
    let status = row.status;
    for (const event of events) {
      const next = eventStatuses[event.type];
      if (next && (rank[next] ?? 0) > (rank[status] ?? 0)) status = next;
    }
    if (status !== row.status)
      await tx
        .update(deliveries)
        .set({ status, updatedAt: new Date() })
        .where(eq(deliveries.id, row.id));
  });
}
export async function recordMailEvent(
  db: Database,
  event: {
    id: string;
    providerId: string;
    type: string;
    occurredAt?: Date | null;
  },
) {
  await db.insert(mailEvents).values(event).onConflictDoNothing();
  await reconcileMailEvents(db, event.providerId);
}
async function claim(db: Database, now: Date, ids?: string[]) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(deliveries)
      .where(
        and(
          or(
            eq(deliveries.status, "pending"),
            and(
              eq(deliveries.cancelRequested, true),
              inArray(deliveries.status, ["scheduled", "failed", "uncertain"]),
            ),
          ),
          lte(deliveries.nextAttemptAt, now),
          or(isNull(deliveries.leaseUntil), lte(deliveries.leaseUntil, now)),
          ids?.length ? inArray(deliveries.id, ids) : undefined,
        ),
      )
      .orderBy(desc(deliveries.cancelRequested), deliveries.nextAttemptAt)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    const token = randomUUID();
    const starting = !row.firstAttemptAt && !row.cancelRequested;
    const [claimed] = await tx
      .update(deliveries)
      .set({
        leaseToken: token,
        leaseUntil: new Date(now.getTime() + 120000),
        attempts: row.attempts + 1,
        ...(starting
          ? {
              firstAttemptAt: now,
              requestScheduledAt: row.dueAt > now ? row.dueAt : null,
            }
          : {}),
      })
      .where(eq(deliveries.id, row.id))
      .returning();
    return claimed;
  });
}
export async function processReminderQueue(
  options: {
    db?: Database;
    provider?: MailProvider;
    now?: Date;
    ids?: string[];
    limit?: number;
  } = {},
) {
  const db = options.db ?? getDatabase();
  const provider = options.provider ?? resendProvider;
  const stats = { scheduled: 0, cancelled: 0, retried: 0, failed: 0 };
  const deadline = Date.now() + 45000;
  for (
    let count = 0;
    count < (options.limit ?? 20) && Date.now() < deadline;
    count++
  ) {
    const now = options.now ?? new Date();
    const row = await claim(db, now, options.ids);
    if (!row) break;
    const ownership = and(
      eq(deliveries.id, row.id),
      eq(deliveries.leaseToken, row.leaseToken!),
    );
    const release = async (values: Partial<typeof deliveries.$inferInsert>) => {
      await db
        .update(deliveries)
        .set({ ...values, leaseToken: null, leaseUntil: null, updatedAt: now })
        .where(ownership);
    };
    try {
      if (row.replacesDeliveryId && !row.cancelRequested) {
        const [old] = await db
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, row.replacesDeliveryId));
        if (old && !terminal.includes(old.status)) {
          await release({
            firstAttemptAt: null,
            requestScheduledAt: null,
            providerPayload: null,
            nextAttemptAt: new Date(now.getTime() + 30000),
          });
          continue;
        }
      }
      if (
        row.cancelRequested &&
        !row.providerId &&
        (!row.firstAttemptAt || row.status === "failed")
      ) {
        await release({ status: "cancelled", lastError: null });
        stats.cancelled++;
        continue;
      }
      // Provider keys expire after 24h. Fail closed after 23h if an earlier request
      // may have succeeded but its response was lost, instead of sending twice.
      if (
        !row.providerId &&
        row.firstAttemptAt &&
        now.getTime() - row.firstAttemptAt.getTime() >= 23 * 3600000
      ) {
        await release({
          status: "uncertain",
          lastError: "Provider acceptance needs manual reconciliation",
          nextAttemptAt: new Date(now.getTime() + 86400000),
        });
        stats.failed++;
        continue;
      }
      if (!row.providerId && row.contestStart <= now) {
        await release({
          status: row.attempts === 1 ? "expired" : "uncertain",
          lastError: "Contest already started; no further sends attempted",
          nextAttemptAt: new Date(now.getTime() + 86400000),
        });
        continue;
      }
      if (
        !row.providerId &&
        row.dueAt.getTime() > now.getTime() + 29 * 86400000
      ) {
        await release({
          firstAttemptAt: null,
          requestScheduledAt: null,
          nextAttemptAt: new Date(row.dueAt.getTime() - 29 * 86400000),
        });
        continue;
      }
      let providerId = row.providerId;
      if (!providerId) {
        if (!row.providerPayload) {
          row.providerPayload = resendPayload(row);
          await db
            .update(deliveries)
            .set({ providerPayload: row.providerPayload })
            .where(ownership);
        }
        providerId = await provider.schedule(row as Delivery);
        await db
          .update(deliveries)
          .set({ providerId, status: "scheduled", lastError: null })
          .where(ownership);
        stats.scheduled++;
      }
      const [latest] = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.id, row.id));
      if (latest.cancelRequested) {
        const status = await provider.cancel(providerId);
        await release({ providerId, status, lastError: null });
        stats.cancelled++;
      } else
        await release({ providerId, status: "scheduled", lastError: null });
      await reconcileMailEvents(db, providerId);
    } catch (error) {
      const retryable = !(error instanceof MailError) || error.retryable;
      const delay = Math.min(
        900000,
        30000 * 2 ** Math.min(row.attempts - 1, 5),
      );
      await release({
        status:
          retryable || row.cancelRequested
            ? row.providerId
              ? "scheduled"
              : "pending"
            : "failed",
        lastError:
          error instanceof MailError
            ? error.message
            : "Mail provider request interrupted",
        nextAttemptAt: new Date(now.getTime() + delay),
      });
      if (retryable) stats.retried++;
      else stats.failed++;
    }
  }
  return stats;
}
