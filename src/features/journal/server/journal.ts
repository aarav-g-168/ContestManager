import { getRecentContests } from "@/features/contests/server/recent-contests";
import { parseAsUTC } from "@/lib/date";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  journalEntries as entries,
  contests,
  bookmarks,
  reminders,
  deliveries,
  users,
} from "@/lib/db/schema";
import { getContestDay } from "@/features/contests/lib/calendar";
import {
  validateJournal,
  type JournalEntry,
  type JournalSnapshot,
  type JournalValues,
  type JournalProblem,
  journalQuery,
} from "@/features/journal/lib/journal";
import { ProfileRequestError } from "@/lib/http/request-error";

type Row = typeof entries.$inferSelect;
function dto(row: Row): JournalEntry {
  return {
    id: row.id,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    values: {
      ...row.data,
      title: row.title,
      host: row.host,
      href: row.href,
      date: row.date,
      contestId: row.contestId,
    },
  };
}
function ownedContest(uid: string) {
  return sql`(exists(select 1 from ${bookmarks} where ${bookmarks.userId}=${uid} and ${bookmarks.contestId}=${contests.id}) or exists(select 1 from ${reminders} where ${reminders.userId}=${uid} and ${reminders.contestId}=${contests.id}) or exists(select 1 from ${deliveries} where ${deliveries.userId}=${uid} and ${deliveries.contestId}=${contests.id}))`;
}
async function canonicalValues(db: Database, uid: string, input: unknown) {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  if (raw.contestId !== null) {
    if (!Number.isSafeInteger(raw.contestId) || Number(raw.contestId) <= 0)
      throw new ProfileRequestError("Choose a valid contest.", 400);
    let [contest] = await db
      .select()
      .from(contests)
      .where(and(eq(contests.id, Number(raw.contestId)), ownedContest(uid)));
    if (!contest) {
      let recent;
      try {
        recent = await getRecentContests();
      } catch {
        throw new ProfileRequestError(
          "Recent contests couldn’t be verified. Try again, or enter the contest manually.", 503,
        );
      }
      const selected = recent.find((item) => item.id === raw.contestId);
      if (!selected)
        throw new ProfileRequestError("That contest is no longer in the recent list. Enter its details manually.", 404);
      // Provider data is public; other users' saved state and notes remain private.
      await db.insert(contests).values({
        id: selected.id, event: selected.event, host: selected.host,
        href: selected.href, start: parseAsUTC(selected.start), duration: selected.duration,
      }).onConflictDoNothing();
      [contest] = await db.select().from(contests).where(eq(contests.id, selected.id));
    }
    if (contest.start > new Date())
      throw new ProfileRequestError(
        "Add this contest to your journal once it starts.",
        400,
      );
    return validateJournal({
      ...raw,
      title: contest.event,
      host: contest.host,
      date: getContestDay(contest.start),
      href: contest.href,
    });
  }
  return validateJournal(raw);
}
function columns(values: JournalValues) {
  const { title, host, date, href, contestId, ...data } = values;
  return { title, host, date, href, contestId, data };
}
// Dates are server-owned. An older checked item has no known completion date.
export function stampProblems(
  next: JournalProblem[],
  previous: JournalProblem[] = [],
  now = new Date(),
) {
  return next.map((problem) => {
    const before = previous.find((item) => item.id === problem.id);
    return {
      ...problem,
      priority: problem.priority ?? before?.priority ?? "normal",
      plannedDate: problem.plannedDate ?? before?.plannedDate ?? "",
      takeaway: problem.takeaway ?? before?.takeaway ?? "",
      completedAt: problem.done
        ? before?.done
          ? (before.completedAt ?? null)
          : now.toISOString()
        : null,
    };
  });
}
export async function createJournalEntry(
  db: Database,
  uid: string,
  input: unknown,
) {
  const values = await canonicalValues(db, uid, input);
  values.problems = stampProblems(values.problems);
  try {
    const row = await db.transaction(async (tx) => {
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
      const [usage] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(entries)
        .where(eq(entries.userId, uid));
      if (usage.count >= 1000)
        throw new ProfileRequestError(
          "Your journal has reached the 1,000-entry safety limit. Export or remove old entries to add more.",
          429,
        );
      return (
        await tx
          .insert(entries)
          .values({ userId: uid, ...columns(values) })
          .returning()
      )[0];
    });
    return dto(row);
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    if ((e.code ?? e.cause?.code) === "23505")
      throw new ProfileRequestError(
        "This contest already has a journal entry. Open it to make changes.",
        409,
      );
    throw error;
  }
}
export function journalIdentity(input: Record<string, unknown>) {
  if (
    typeof input.id !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      input.id,
    ) ||
    !Number.isSafeInteger(input.revision) ||
    Number(input.revision) < 0 ||
    Number(input.revision) > 2147483646
  )
    throw new ProfileRequestError(
      "Choose a valid journal entry and revision.",
      400,
    );
  return { id: input.id, revision: Number(input.revision) };
}
export async function updateJournalEntry(
  db: Database,
  uid: string,
  input: Record<string, unknown>,
) {
  const { id, revision } = journalIdentity(input);
  const [current] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, uid)));
  if (!current)
    throw new ProfileRequestError("That journal entry was not found.", 404);
  const raw =
    input.values &&
    typeof input.values === "object" &&
    !Array.isArray(input.values)
      ? (input.values as Record<string, unknown>)
      : {};
  if (raw.contestId !== current.contestId)
    throw new ProfileRequestError(
      "An entry’s source contest cannot be changed. Start a new entry instead.",
      400,
    );
  // A journal is a historical snapshot. Later feed edits or removed bookmarks
  // must not rewrite its contest details or prevent the owner editing notes.
  const values = validateJournal(
    current.contestId === null
      ? raw
      : {
          ...raw,
          title: current.title,
          host: current.host,
          date: current.date,
          href: current.href,
        },
  );
  values.problems = stampProblems(values.problems, current.data.problems);
  const [updated] = await db
    .update(entries)
    .set({
      ...columns(values),
      revision: sql`${entries.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(entries.id, id),
        eq(entries.userId, uid),
        eq(entries.revision, revision),
      ),
    )
    .returning();
  if (!updated)
    throw new ProfileRequestError(
      "This entry changed in another tab. Reload the latest entry before saving.",
      409,
    );
  return dto(updated);
}
export async function getJournal(
  db: Database,
  uid: string,
  query: ReturnType<typeof journalQuery>,
): Promise<JournalSnapshot> {
  const owner = eq(entries.userId, uid);
  const search = "%" + query.q.replace(/[\\%_]/g, "\\$&") + "%";
  const filter = and(
    owner,
    query.host ? eq(entries.host, query.host) : undefined,
    query.status ? sql`${entries.data}->>'status'=${query.status}` : undefined,
    query.topic ? sql`(${entries.data}->'tags') ? ${query.topic}` : undefined,
    query.from ? gte(entries.date, query.from) : undefined,
    query.to ? lte(entries.date, query.to) : undefined,
    query.q
      ? sql`(${entries.title} ilike ${search} or ${entries.data}::text ilike ${search})`
      : undefined,
  );
  const [rows, total, stats, candidates, platforms, topics, recent] = await Promise.all(
    [
      db
        .select()
        .from(entries)
        .where(filter)
        .orderBy(desc(entries.date), desc(entries.updatedAt), entries.id)
        .limit(20)
        .offset((query.page - 1) * 20),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(entries)
        .where(filter),
      db
        .select({
          total: sql<number>`count(*)::int`,
          participated: sql<number>`count(*) filter(where ${entries.data}->>'status'='participated')::int`,
          pendingProblems: sql<number>`coalesce(sum((select count(*) from jsonb_array_elements(${entries.data}->'problems') p where p->>'done'='false')),0)::int`,
        })
        .from(entries)
        .where(owner),
      db
        .select({
          id: contests.id,
          title: contests.event,
          host: contests.host,
          start: contests.start,
          href: contests.href,
          entryId: entries.id,
        })
        .from(contests)
        .leftJoin(
          entries,
          and(eq(entries.contestId, contests.id), eq(entries.userId, uid)),
        )
        .where(and(ownedContest(uid), lte(contests.start, new Date())))
        .orderBy(desc(contests.start))
        .limit(100),
      db
        .selectDistinct({ host: entries.host })
        .from(entries)
        .where(owner)
        .orderBy(entries.host),
      db.execute(
        sql`select distinct jsonb_array_elements_text(${entries.data}->'tags') as topic from ${entries} where ${owner}`,
      ),
      getRecentContests().then(
        (contests) => ({ contests, error: null }),
        () => ({ contests: [], error: "Recent contests couldn’t load. Your saved contests are still available. Retry with Refresh, or enter details manually." }),
      ),
    ],
  );
  const linked = recent.contests.length ? await db.select({ contestId: entries.contestId, id: entries.id })
    .from(entries).where(and(owner, inArray(entries.contestId, recent.contests.map((c) => c.id)))) : [];
  const candidateMap = new Map(candidates.map(({ start, ...row }) => [row.id, { ...row, date: getContestDay(start) }]));
  for (const contest of recent.contests) {
    if (!candidateMap.has(contest.id)) candidateMap.set(contest.id, {
      id: contest.id, title: contest.event, host: contest.host, href: contest.href,
      date: getContestDay(parseAsUTC(contest.start)),
      entryId: linked.find((entry) => entry.contestId === contest.id)?.id ?? null,
    });
  }
  const lastPage = Math.max(1, Math.ceil(total[0].count / 20));
  if (query.page > lastPage)
    return getJournal(db, uid, { ...query, page: lastPage });
  return {
    entries: rows.map(dto),
    total: total[0].count,
    page: query.page,
    pageSize: 20,
    stats: stats[0],
    candidates: [...candidateMap.values()].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    candidateError: recent.error,
    platforms: platforms.map((row) => row.host),
    topics: topics.rows.map((row) => String(row.topic)).sort(),
  };
}

export async function deleteJournalEntry(
  db: Database,
  uid: string,
  input: Record<string, unknown>,
) {
  if (input.confirmation !== "DELETE")
    throw new ProfileRequestError(
      "Confirm that you want to delete this journal entry.",
      400,
    );
  const { id, revision } = journalIdentity(input);
  const removed = await db
    .delete(entries)
    .where(
      and(
        eq(entries.id, id),
        eq(entries.userId, uid),
        eq(entries.revision, revision),
      ),
    )
    .returning({ id: entries.id });
  if (!removed.length) {
    const [existing] = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, uid)));
    throw new ProfileRequestError(
      existing
        ? "This entry changed. Refresh before deleting it."
        : "That entry was not found.",
      existing ? 409 : 404,
    );
  }
  return { deleted: true };
}
