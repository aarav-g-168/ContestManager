import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  accountPreferences,
  deliveries,
  reminders,
  users,
  bookmarks,
  journalEntries,
} from "@/lib/db/schema";
import {
  type AccountSettings,
  validateSettings,
} from "@/features/account/lib/settings";
import { ProfileRequestError } from "@/lib/http/request-error";
export async function getSettings(
  db: Database,
  uid: string,
): Promise<AccountSettings> {
  const [preference] = await db
    .select()
    .from(accountPreferences)
    .where(eq(accountPreferences.userId, uid));
  const [owner] = await db
    .select({
      state: users.accountState,
      photo: users.photoPath,
      mode: users.avatarMode,
    })
    .from(users)
    .where(eq(users.id, uid));
  const [steps] = await db
    .select({
      saved: sql<boolean>`exists(select 1 from ${bookmarks} where user_id=${uid})`,
      reminded: sql<boolean>`exists(select 1 from ${deliveries} where user_id=${uid} and status not in ('cancelled','failed','expired'))`,
      journaled: sql<boolean>`exists(select 1 from ${journalEntries} where user_id=${uid})`,
    })
    .from(sql`(select 1) as source`);
  return {
    defaultReminder: (preference?.defaultReminder ??
      "15m") as AccountSettings["defaultReminder"],
    remindersPaused: preference?.remindersPaused ?? false,
    onboardingDismissed: preference?.onboardingDismissed ?? false,
    revision: preference?.revision ?? null,
    deleting: owner?.state === "deleting",
    hasPhoto: owner?.mode === "custom" && !!owner.photo,
    onboarding: steps,
  };
}
export async function saveSettings(
  db: Database,
  uid: string,
  input: unknown,
  now = new Date(),
) {
  const values = validateSettings(input),
    { revision, ...fields } = values;
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(users)
      .where(eq(users.id, uid))
      .for("update");
    if (!owner || owner.accountState !== "active")
      throw new ProfileRequestError(
        "Your account is unavailable for changes.",
        423,
      );
    const rows =
      revision === null
        ? await tx
            .insert(accountPreferences)
            .values({ userId: uid, ...fields, updatedAt: now })
            .onConflictDoNothing()
            .returning()
        : await tx
            .update(accountPreferences)
            .set({
              ...fields,
              updatedAt: now,
              revision: sql`${accountPreferences.revision}+1`,
            })
            .where(
              and(
                eq(accountPreferences.userId, uid),
                eq(accountPreferences.revision, revision),
              ),
            )
            .returning();
    if (!rows.length)
      throw new ProfileRequestError(
        "Your preferences changed in another tab. Refresh before saving.",
        409,
      );
    if (values.remindersPaused) {
      await tx
        .update(deliveries)
        .set({ cancelRequested: true, nextAttemptAt: now })
        .where(
          and(
            eq(deliveries.userId, uid),
            inArray(deliveries.status, ["pending", "scheduled", "uncertain"]),
          ),
        );
      await tx.delete(reminders).where(eq(reminders.userId, uid));
    }
  });
  return getSettings(db, uid);
}
