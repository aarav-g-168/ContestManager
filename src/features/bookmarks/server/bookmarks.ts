import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { bookmarks, users } from "@/lib/db/schema";
import { ProfileRequestError } from "@/lib/http/request-error";
export async function saveBookmark(
  db: Database,
  uid: string,
  contestId: number,
) {
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ state: users.accountState })
      .from(users)
      .where(eq(users.id, uid))
      .for("update");
    if (!owner || owner.state !== "active")
      throw new ProfileRequestError(
        "Your account is unavailable for changes.",
        423,
      );
    const [existing] = await tx
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.userId, uid), eq(bookmarks.contestId, contestId)),
      );
    if (existing) return;
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bookmarks)
      .where(eq(bookmarks.userId, uid));
    if (count >= 500)
      throw new ProfileRequestError(
        "You can save up to 500 contests. Remove some bookmarks before adding another.",
        429,
      );
    await tx
      .insert(bookmarks)
      .values({ userId: uid, contestId })
      .onConflictDoNothing();
  });
}
