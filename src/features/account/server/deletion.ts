import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray, lt, or, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  accountDeletions,
  deliveries,
  reminders,
  users,
  teams,
  mailEvents,
  requestBuckets,
} from "@/lib/db/schema";
import type { VerifiedAccount } from "@/features/auth/server/auth";
import { photoStorage } from "@/features/profile/server/storage";
import { accountBucketPrefix } from "@/lib/security/rate-limit";
import { ProfileRequestError } from "@/lib/http/request-error";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export interface DeletionProvider {
  erasePhotos(uid: string): Promise<boolean>;
  deleteIdentity(authId: string): Promise<void>;
}
export const deletionProvider: DeletionProvider = {
  async erasePhotos(uid) {
    if (uid.includes("/") || uid.includes(".."))
      throw new Error("Unexpected storage owner");
    const { files } = photoStorage(),
      prefix = `profile-photos/${uid}`;
    const { data, error } = await files.list(prefix, { limit: 100 });
    if (error) throw new Error("Storage unavailable");
    if (!data?.length) return true;
    const { error: removed } = await files.remove(
      data.map((item) => `${prefix}/${item.name}`),
    );
    if (removed) throw new Error("Storage cleanup unavailable");
    return false; // Check the now-empty prefix on the next durable pass.
  },
  async deleteIdentity(authId) {
    const { error } = await photoStorage().client.auth.admin.deleteUser(authId);
    if (error && error.status !== 404)
      throw new Error("Identity cleanup unavailable");
  },
};
export async function requestDeletion(
  db: Database,
  account: VerifiedAccount,
  input: unknown,
  now = new Date(),
) {
  const raw = input as Record<string, unknown> | null;
  if (!raw || raw.confirmation !== "DELETE")
    throw new ProfileRequestError(
      "Type DELETE to confirm permanent account deletion.",
      400,
    );
  const lastSignIn = Date.parse(account.signedInAt ?? "");
  if (
    !Number.isFinite(lastSignIn) ||
    lastSignIn > now.getTime() + 60000 ||
    now.getTime() - lastSignIn > 10 * 60000
  )
    throw new ProfileRequestError(
      "Sign in with Google again before deleting your account.",
      428,
    );
  const receipt =
    typeof raw.receipt === "string" && /^[a-f0-9]{64}$/.test(raw.receipt)
      ? raw.receipt
      : randomBytes(32).toString("hex");
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(users)
      .where(eq(users.id, account.uid))
      .for("update");
    if (!owner)
      throw new ProfileRequestError("Your account was not found.", 404);
    if (owner.accountState === "deleting") {
      const [existing] = await tx
        .select()
        .from(accountDeletions)
        .where(
          and(
            eq(accountDeletions.userId, account.uid),
            eq(accountDeletions.receiptHash, hash(receipt)),
          ),
        );
      if (existing) return;
      throw new ProfileRequestError(
        "Deletion is already in progress. Use the receipt in this browser or contact support.",
        409,
      );
    }
    await tx
      .update(users)
      .set({ accountState: "deleting" })
      .where(eq(users.id, account.uid));
    await tx
      .update(deliveries)
      .set({ cancelRequested: true, nextAttemptAt: now })
      .where(
        and(
          eq(deliveries.userId, account.uid),
          inArray(deliveries.status, ["pending", "scheduled", "uncertain"]),
        ),
      );
    await tx.delete(reminders).where(eq(reminders.userId, account.uid));
    await tx.insert(accountDeletions).values({
      userId: account.uid,
      authId: account.authId,
      receiptHash: hash(receipt),
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 86400000),
    });
  });
  return { receipt, status: "pending" };
}
export async function deletionStatus(
  db: Database,
  receipt: string,
  now = new Date(),
) {
  if (!/^[a-f0-9]{64}$/.test(receipt))
    throw new ProfileRequestError("That deletion receipt is invalid.", 404);
  const [job] = await db
    .select({
      status: accountDeletions.status,
      lastError: accountDeletions.lastError,
      expiresAt: accountDeletions.expiresAt,
    })
    .from(accountDeletions)
    .where(eq(accountDeletions.receiptHash, hash(receipt)));
  if (!job || job.expiresAt < now)
    throw new ProfileRequestError(
      "This deletion receipt is no longer available. Contact support if you need help.",
      404,
    );
  return {
    status: job.status,
    message:
      job.status === "complete"
        ? "Your account data and sign-in have been deleted."
        : (job.lastError ??
          "Stopping future emails and cleaning up your account. This can take a few minutes."),
  };
}
export async function processAccountDeletions(
  db: Database,
  provider = deletionProvider,
  now = new Date(),
) {
  const token = randomUUID();
  const job = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(accountDeletions)
      .where(
        and(
          eq(accountDeletions.status, "pending"),
          lt(accountDeletions.createdAt, new Date(now.getTime() - 120000)),
          or(
            isNull(accountDeletions.leaseUntil),
            lt(accountDeletions.leaseUntil, now),
          ),
        ),
      )
      .orderBy(accountDeletions.updatedAt)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    return (
      await tx
        .update(accountDeletions)
        .set({ leaseToken: token, leaseUntil: new Date(now.getTime() + 60000) })
        .where(eq(accountDeletions.id, row.id))
        .returning()
    )[0];
  });
  if (!job?.userId || !job.authId) return { processed: 0 };
  const owner = job.userId;
  const release = async (lastError: string | null) =>
    db
      .update(accountDeletions)
      .set({ leaseToken: null, leaseUntil: null, lastError, updatedAt: now })
      .where(
        and(
          eq(accountDeletions.id, job.id),
          eq(accountDeletions.leaseToken, token),
        ),
      );
  try {
    const [pending] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveries)
      .where(
        and(
          eq(deliveries.userId, owner),
          sql`(${deliveries.leaseUntil} is not null or ${deliveries.status} in ('pending','scheduled','uncertain'))`,
        ),
      );
    if (pending.count) {
      await release(
        "Waiting for pending email cancellations to be confirmed. Contact support if this does not clear.",
      );
      return { processed: 0 };
    }
    if (!(await provider.erasePhotos(owner))) {
      await release("Removing profile photos. Cleanup will continue shortly.");
      return { processed: 0 };
    }
    await provider.deleteIdentity(job.authId);
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(accountDeletions)
        .where(
          and(
            eq(accountDeletions.id, job.id),
            eq(accountDeletions.leaseToken, token),
          ),
        )
        .for("update");
      if (!locked) throw new Error("Deletion lease changed");
      await tx
        .delete(mailEvents)
        .where(
          sql`${mailEvents.providerId} in (select provider_id from ${deliveries} where user_id=${owner})`,
        );
      await tx.delete(teams).where(eq(teams.ownerId, owner));
      await tx.delete(users).where(eq(users.id, owner));
      await tx
        .delete(requestBuckets)
        .where(
          sql`${requestBuckets.key} like ${accountBucketPrefix(owner) + "%"}`,
        );
      await tx
        .update(accountDeletions)
        .set({
          userId: null,
          authId: null,
          status: "complete",
          lastError: null,
          leaseToken: null,
          leaseUntil: null,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 7 * 86400000),
        })
        .where(eq(accountDeletions.id, job.id));
    });
    return { processed: 1 };
  } catch {
    await release(
      "Account cleanup could not finish yet. It will retry automatically; contact support if it remains pending.",
    );
    return { processed: 0 };
  }
}
