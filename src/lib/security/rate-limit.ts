import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { requestBuckets } from "@/lib/db/schema";
import { ProfileRequestError } from "@/lib/http/request-error";
export const accountBucketPrefix = (uid: string) =>
  createHash("sha256").update(uid).digest("hex") + ":";
export async function takeRequestLimit(
  db: Database,
  uid: string,
  scope: string,
  limit: number,
  seconds: number,
  now = new Date(),
) {
  const key = accountBucketPrefix(uid) + scope,
    expiresAt = new Date(now.getTime() + seconds * 1000);
  const rows = await db
    .insert(requestBuckets)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: requestBuckets.key,
      set: {
        count: sql`case when ${requestBuckets.expiresAt} <= ${now} then 1 else ${requestBuckets.count}+1 end`,
        expiresAt: sql`case when ${requestBuckets.expiresAt} <= ${now} then ${expiresAt} else ${requestBuckets.expiresAt} end`,
      },
      setWhere: sql`${requestBuckets.expiresAt} <= ${now} or ${requestBuckets.count} < ${limit}`,
    })
    .returning();
  if (!rows.length)
    throw new ProfileRequestError(
      "Too many requests. Please wait before trying again.",
      429,
      { "Retry-After": String(seconds) },
    );
}
