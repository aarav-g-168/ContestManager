import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { journalEntries as entries } from "@/lib/db/schema";
import { getContestDay } from "@/features/contests/lib/calendar";
import {
  journalIdentity,
  stampProblems,
} from "@/features/journal/server/journal";
import {
  validateJournal,
  type JournalProblem,
} from "@/features/journal/lib/journal";
import type {
  PracticeItem,
  PracticeQuery,
  PracticeSnapshot,
} from "@/features/journal/lib/practice";
import { ProfileRequestError } from "@/lib/http/request-error";

const expanded = sql`${entries} e cross join lateral jsonb_array_elements(e.data->'problems') p`;
export async function getPractice(
  db: Database,
  uid: string,
  query: PracticeQuery,
  now = new Date(),
): Promise<PracticeSnapshot> {
  const today = getContestDay(now);
  const search = "%" + query.q.replace(/[\\%_]/g, "\\$&") + "%";
  const filter = sql`e.user_id=${uid}
    and (${query.platform}='' or e.host=${query.platform})
    and (${query.topic}='' or (e.data->'tags') ? ${query.topic})
    and (${query.priority}='' or coalesce(p->>'priority','normal')=${query.priority})
    and (${query.planned}='' or p->>'plannedDate'=${query.planned})
    and (${query.status}='all' or (p->>'done'='true')=(${query.status}='completed'))
    and (${query.q}='' or p->>'title' ilike ${search} or e.title ilike ${search} or p->>'takeaway' ilike ${search})`;
  const [rows, count, stats, platforms, topics] = await Promise.all([
    db.execute(sql`select e.id as "entryId",e.revision,e.title as contest,e.host,e.data->'tags' as topics,p as problem
      from ${expanded} where ${filter}
      order by (p->>'done'='true'), nullif(p->>'plannedDate','') asc nulls last,
      case coalesce(p->>'priority','normal') when 'high' then 0 when 'normal' then 1 else 2 end,
      e.contest_date desc,e.id,p->>'id' limit 20 offset ${(query.page - 1) * 20}`),
    db.execute(
      sql`select count(*)::int as total from ${expanded} where ${filter}`,
    ),
    db.execute(sql`select
      count(*) filter(where p->>'done'='false')::int as pending,
      count(*) filter(where p->>'done'='true')::int as completed,
      count(*) filter(where p->>'done'='false' and nullif(p->>'plannedDate','') < ${today})::int as overdue,
      count(*) filter(where p->>'done'='false' and nullif(p->>'plannedDate','') >= ${today})::int as planned
      from ${expanded} where e.user_id=${uid}`),
    db
      .selectDistinct({ host: entries.host })
      .from(entries)
      .where(eq(entries.userId, uid))
      .orderBy(entries.host),
    db.execute(
      sql`select distinct jsonb_array_elements_text(data->'tags') as topic from ${entries} where user_id=${uid}`,
    ),
  ]);
  const lastPage = Math.max(1, Math.ceil(Number(count.rows[0].total) / 20));
  if (query.page > lastPage)
    return getPractice(db, uid, { ...query, page: lastPage }, now);
  return {
    items: rows.rows as PracticeItem[],
    total: Number(count.rows[0].total),
    page: query.page,
    pageSize: 20,
    stats: stats.rows[0] as PracticeSnapshot["stats"],
    platforms: platforms.map((p) => p.host),
    topics: topics.rows.map((p) => String(p.topic)).sort(),
  };
}
export async function updatePractice(
  db: Database,
  uid: string,
  input: Record<string, unknown>,
  now = new Date(),
) {
  const { id, revision } = journalIdentity(input);
  const [current] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, uid)));
  if (!current)
    throw new ProfileRequestError("That journal entry was not found.", 404);
  const problem = current.data.problems.find((p) => p.id === input.problemId);
  if (!problem)
    throw new ProfileRequestError("That problem was not found.", 404);
  const patch = input.problem;
  if (!patch || typeof patch !== "object" || Array.isArray(patch))
    throw new ProfileRequestError("Choose valid practice details.", 400);
  const raw = patch as Record<string, unknown>;
  // Deliberately accept only practice fields; contest results and problem identity stay unchanged.
  const updatedProblem = {
    ...problem,
    done: raw.done,
    priority: raw.priority,
    plannedDate: raw.plannedDate,
    takeaway: raw.takeaway,
  };
  const values = validateJournal(
    {
      ...current.data,
      title: current.title,
      host: current.host,
      date: current.date,
      href: current.href,
      contestId: current.contestId,
      problems: current.data.problems.map((p) =>
        p.id === problem.id ? updatedProblem : p,
      ),
    },
    now,
  );
  values.problems = stampProblems(values.problems, current.data.problems, now);
  const [row] = await db
    .update(entries)
    .set({
      data: { ...current.data, problems: values.problems },
      revision: sql`${entries.revision}+1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(entries.id, id),
        eq(entries.userId, uid),
        eq(entries.revision, revision),
      ),
    )
    .returning();
  if (!row)
    throw new ProfileRequestError(
      "This entry changed in another tab. Refresh the queue before saving again.",
      409,
    );
  return {
    revision: row.revision,
    problem: row.data.problems.find(
      (p) => p.id === problem.id,
    ) as JournalProblem,
  };
}

export async function getPlannedPractice(
  db: Database,
  uid: string,
  from: string,
  to: string,
) {
  const result =
    await db.execute(sql`select e.id as "entryId",e.revision,e.title as contest,e.host,e.data->'tags' as topics,p as problem
    from ${expanded} where e.user_id=${uid} and p->>'done'='false' and p->>'plannedDate' >= ${from} and p->>'plannedDate' <= ${to}
    order by p->>'plannedDate',e.id,p->>'id' limit 101`);
  return {
    items: (result.rows as PracticeItem[]).slice(0, 100),
    more: result.rows.length > 100,
  };
}
