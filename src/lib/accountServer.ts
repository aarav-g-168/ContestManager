import { eq } from "drizzle-orm";
import type { VerifiedAccount } from "./authServer";
import { getDatabase } from "./db";
import { users, contests } from "./db/schema";
import { getContestFeed } from "./contestFeed";
import { parseAsUTC } from "./date";
import { ProfileRequestError } from "./profileServer";

export async function ensureAccount(token: VerifiedAccount) {
  const db = getDatabase();
  await db
    .insert(users)
    .values({
      id: token.uid,
      email: token.email ?? null,
      name: token.name ?? null,
      googlePhotoUrl: token.picture ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: token.email ?? null,
        name: token.name ?? null,
        googlePhotoUrl: token.picture ?? null,
      },
    });
  return (await db.select().from(users).where(eq(users.id, token.uid)))[0];
}
export async function verifiedContest(id: unknown) {
  if (!Number.isSafeInteger(id) || Number(id) <= 0)
    throw new ProfileRequestError("Choose a valid contest.", 400);
  const { contests: feed, error } = await getContestFeed();
  if (error)
    throw new ProfileRequestError(
      "The contest schedule is unavailable. Try again shortly.",
      503,
    );
  const contest = feed.find((item) => item.id === id);
  if (!contest)
    throw new ProfileRequestError("This contest is no longer available.", 400);
  const url = new URL(contest.href);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new ProfileRequestError("This contest link is unavailable.", 400);
  await getDatabase()
    .insert(contests)
    .values({
      id: contest.id,
      event: contest.event,
      host: contest.host,
      href: contest.href,
      start: parseAsUTC(contest.start),
      duration: contest.duration,
    })
    .onConflictDoUpdate({
      target: contests.id,
      set: {
        event: contest.event,
        host: contest.host,
        href: contest.href,
        start: parseAsUTC(contest.start),
        duration: contest.duration,
        updatedAt: new Date(),
      },
    });
  return contest;
}
