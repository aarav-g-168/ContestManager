import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import {
  blankJournal,
  validateJournal,
} from "../../src/features/journal/lib/journal";
import { practiceQuery } from "../../src/features/journal/lib/practice";
import {
  getPractice,
  updatePractice,
} from "../../src/features/journal/server/practice";
import {
  stampProblems,
  updateJournalEntry,
} from "../../src/features/journal/server/journal";
import { getWeekPlan } from "../../src/features/week/server/week";
import { getProgress } from "../../src/features/progress/server/progress";
import { GET, PATCH } from "../../src/app/api/journal/practice/route";

const now = new Date("2026-10-24T04:30:00Z");
const base = {
  ...blankJournal("2024-01-01"),
  title: "An older round",
  host: "codeforces.com",
  tags: ["DP"],
  lessons: "private review text",
  problems: [
    {
      id: "a",
      title: "A. Old checkbox",
      url: "https://example.test/a",
      done: true,
    },
    { id: "b", title: "B. Paths", url: "https://example.test/b", done: false },
  ],
};
for (const params of [
  "priority=__proto__",
  "status=sent",
  "page=0",
  "planned=2026-02-30",
  "q=" + "x".repeat(121),
])
  assert.throws(() => practiceQuery(new URLSearchParams(params)));
for (const patch of [
  { priority: "urgent" },
  { priority: ["normal"] },
  { priority: null },
  { plannedDate: "2026-02-30" },
  { plannedDate: "1999-01-01" },
  { takeaway: "x".repeat(1001) },
])
  assert.throws(() =>
    validateJournal({ ...base, problems: [{ ...base.problems[1], ...patch }] }),
  );
const old = stampProblems(base.problems, base.problems, now);
assert.equal(
  old[0].completedAt,
  null,
  "Legacy completions do not acquire invented dates",
);
assert.equal(
  stampProblems([{ ...base.problems[1], done: true }], base.problems, now)[0]
    .completedAt,
  now.toISOString(),
);
const engine = new PGlite();
const db = drizzle(engine, { schema }) as unknown as Database;
const globals = globalThis as typeof globalThis & {
  contestDatabase?: Database;
};
const previous = globals.contestDatabase,
  originalFetch = globalThis.fetch;
let authId = "alice";
try {
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await engine.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(schema.users).values([{ id: "alice" }, { id: "bob" }]);
  const { title, host, date, href, contestId, ...data } = base;
  const [entry] = await db
    .insert(schema.journalEntries)
    .values({ userId: "alice", title, host, date, href, contestId, data })
    .returning();
  await db.insert(schema.journalEntries).values({
    userId: "bob",
    title: "Bob private round",
    host,
    date,
    href,
    contestId,
    data: {
      ...data,
      problems: [
        {
          id: "secret",
          title: "Bob secret problem",
          url: "",
          done: false,
          plannedDate: "2026-10-24",
        },
      ],
    },
  });
  const query = practiceQuery(new URLSearchParams());
  let snapshot = await getPractice(db, "alice", query, now);
  assert.equal(snapshot.total, 1);
  assert.equal(snapshot.stats.completed, 1);
  assert.equal(snapshot.items[0].problem.title, "B. Paths");
  assert.ok(!JSON.stringify(snapshot).includes("private review text"));
  assert.ok(!JSON.stringify(snapshot).includes("Bob secret"));
  const details = {
    done: false,
    priority: "high",
    plannedDate: "2026-10-24",
    takeaway: "Draw the state transitions first.",
  };
  let saved = await updatePractice(
    db,
    "alice",
    {
      id: entry.id,
      revision: 0,
      problemId: "b",
      problem: {
        ...details,
        done: true,
        completedAt: "2000-01-01T00:00:00Z",
        title: "Tampered",
        url: "javascript:alert(1)",
      },
    },
    now,
  );
  assert.equal(saved.problem.completedAt, now.toISOString());
  assert.equal(
    saved.problem.title,
    "B. Paths",
    "Narrow patch cannot rewrite problem identity",
  );
  let progress = await getProgress(
    db,
    "alice",
    { months: 3, platform: "" },
    now,
  );
  assert.equal(
    progress.totals.entries,
    0,
    "Contest predates the reporting period",
  );
  assert.equal(
    progress.practice.completed,
    1,
    "Practice is counted by completion date, even for an older contest",
  );
  assert.equal(progress.practice.monthly.at(-1)?.completed, 1);
  assert.equal(
    (
      await getProgress(
        db,
        "alice",
        { months: 3, platform: "leetcode.com" },
        now,
      )
    ).practice.completed,
    0,
  );
  const newer = new Date("2026-10-25T00:00:00Z");
  saved = await updatePractice(
    db,
    "alice",
    {
      id: entry.id,
      revision: saved.revision,
      problemId: "b",
      problem: { ...details, done: true },
    },
    newer,
  );
  assert.equal(
    saved.problem.completedAt,
    now.toISOString(),
    "Editing a takeaway does not change completion time",
  );
  await assert.rejects(
    () =>
      updatePractice(
        db,
        "alice",
        { id: entry.id, revision: 0, problemId: "b", problem: details },
        now,
      ),
    /another tab/,
  );
  await assert.rejects(
    () =>
      updatePractice(
        db,
        "bob",
        {
          id: entry.id,
          revision: saved.revision,
          problemId: "b",
          problem: details,
        },
        now,
      ),
    /not found/,
  );
  saved = await updatePractice(
    db,
    "alice",
    {
      id: entry.id,
      revision: saved.revision,
      problemId: "b",
      problem: details,
    },
    now,
  );
  assert.equal(saved.problem.completedAt, null);
  assert.equal(
    (await getProgress(db, "alice", { months: 3, platform: "" }, now)).practice
      .completed,
    0,
  );
  const plan = await getWeekPlan(db, "alice", now);
  assert.equal(plan.practice?.items.length, 1);
  assert.equal(plan.practice?.items[0].problem.title, "B. Paths");
  assert.ok(!JSON.stringify(plan).includes("private review text"));
  // A full journal save from an older client must preserve practice metadata.
  const legacy = await updateJournalEntry(db, "alice", {
    id: entry.id,
    revision: saved.revision,
    values: base,
  });
  assert.equal(legacy.values.problems[1].priority, "high");
  assert.equal(legacy.values.problems[1].plannedDate, "2026-10-24");
  assert.equal(legacy.values.problems[1].takeaway, details.takeaway);
  // Include enough entries to prove the queue is not limited to the journal's first page.
  await db.insert(schema.journalEntries).values(
    Array.from({ length: 25 }, (_, i) => ({
      userId: "alice",
      title: `Extra ${i}`,
      host: "leetcode.com",
      date: "2025-01-01",
      data: {
        ...data,
        tags: ["Graphs"],
        problems: [
          {
            id: `p-${i}`,
            title: `Extra problem ${i}`,
            url: "",
            done: false,
            priority: "low" as const,
            plannedDate: i === 0 ? "2026-10-23" : "",
          },
        ],
      },
    })),
  );
  snapshot = await getPractice(db, "alice", query, now);
  assert.equal(snapshot.total, 26);
  assert.equal(snapshot.items.length, 20);
  assert.equal(snapshot.stats.overdue, 1);
  assert.equal(
    snapshot.items[0].problem.title,
    "Extra problem 0",
    "Earliest planned date comes first",
  );
  const second = await getPractice(db, "alice", { ...query, page: 2 }, now);
  assert.equal(second.items.length, 6);
  const clamped = await getPractice(db, "alice", { ...query, page: 999 }, now);
  assert.equal(clamped.page, 2);
  assert.equal(clamped.items.length, 6);
  assert.ok(
    second.items.every(
      (b) =>
        !snapshot.items.some(
          (a) => a.entryId === b.entryId && a.problem.id === b.problem.id,
        ),
    ),
  );
  assert.equal(
    (await getPractice(db, "alice", { ...query, topic: "DP" }, now)).total,
    1,
  );
  assert.equal(
    (await getPractice(db, "alice", { ...query, priority: "high" }, now)).total,
    1,
  );
  assert.equal(
    (await getPractice(db, "alice", { ...query, planned: "2026-10-24" }, now))
      .total,
    1,
  );
  assert.equal(
    (
      await getPractice(
        db,
        "alice",
        { ...query, platform: "leetcode.com" },
        now,
      )
    ).total,
    25,
  );
  assert.equal(
    (await getPractice(db, "alice", { ...query, q: "state transitions" }, now))
      .total,
    1,
  );
  assert.equal(
    (await getPractice(db, "alice", { ...query, q: "%" }, now)).total,
    0,
    "Search wildcards are literal",
  );
  assert.equal(
    (await getPractice(db, "alice", { ...query, status: "completed" }, now))
      .total,
    1,
  );
  globals.contestDatabase = db;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://practice-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  globalThis.fetch = async () =>
    Response.json({
      id: authId,
      email_confirmed_at: now.toISOString(),
      user_metadata: {},
      identities: [],
    });
  const request = (method = "GET", input?: unknown, query = "") =>
    new Request(`http://localhost/api/journal/practice?${query}`, {
      method,
      headers: {
        Authorization: "Bearer fake",
        "Content-Type": "application/json",
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
  assert.equal(
    (await GET(new Request("http://localhost/api/journal/practice"))).status,
    401,
  );
  assert.equal(
    (
      await PATCH(
        new Request("http://localhost/api/journal/practice", {
          method: "PATCH",
        }),
      )
    ).status,
    401,
  );
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  assert.equal(
    (await GET(request("GET", undefined, "status=bad"))).status,
    400,
  );
  assert.equal(
    (
      await PATCH(
        request("PATCH", {
          id: entry.id,
          revision: legacy.revision,
          problemId: "missing",
          problem: details,
        }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await PATCH(
        request("PATCH", {
          id: entry.id,
          revision: legacy.revision,
          problemId: "b",
          problem: { ...details, plannedDate: "bad" },
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await PATCH(
        request("PATCH", {
          id: entry.id,
          revision: 0,
          problemId: "b",
          problem: details,
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await PATCH(
        request("PATCH", {
          id: entry.id,
          revision: legacy.revision,
          problemId: "b",
          problem: details,
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await PATCH(request("PATCH", { takeaway: "x".repeat(9000) }))).status,
    413,
  );
  authId = "bob";
  const privateResponse = await (
    await GET(request("GET", undefined, "uid=alice"))
  ).json();
  assert.equal(privateResponse.total, 1);
  assert.equal(privateResponse.items[0].problem.title, "Bob secret problem");
  assert.equal(
    (
      await PATCH(
        request("PATCH", {
          id: entry.id,
          revision: legacy.revision,
          problemId: "b",
          problem: details,
        }),
      )
    ).status,
    404,
  );
  const [boundary] = await db
    .insert(schema.journalEntries)
    .values({
      userId: "alice",
      title: "Boundary round",
      host: "boundary.test",
      date: "2024-01-01",
      data: {
        ...data,
        problems: [
          {
            id: "boundary",
            title: "After midnight",
            url: "",
            done: true,
            completedAt: "2026-10-31T18:45:00Z",
          },
        ],
      },
    })
    .returning();
  const boundaryProgress = await getProgress(
    db,
    "alice",
    { months: 3, platform: "boundary.test" },
    new Date("2026-10-31T19:00:00Z"),
  );
  assert.equal(
    boundaryProgress.practice.monthly.find((month) => month.key === "2026-11")
      ?.completed,
    1,
    "Completion month follows IST, not UTC",
  );
  assert.equal(
    boundaryProgress.practice.monthly.find((month) => month.key === "2026-10")
      ?.completed,
    0,
  );
  assert.equal(
    (
      await getProgress(
        db,
        "alice",
        { months: 3, platform: "boundary.test" },
        now,
      )
    ).practice.completed,
    0,
    "Future completions are not counted",
  );
  assert.equal(
    (
      await getProgress(
        db,
        "bob",
        { months: 3, platform: "boundary.test" },
        new Date("2026-10-31T19:00:00Z"),
      )
    ).practice.completed,
    0,
    "Dated completions remain owner-scoped",
  );
  assert.ok(boundary.id);
  console.log(
    "Practice checks passed: owner-scoped API, pagination across the full journal, filters, input bounds, narrow edits, revision conflicts, server completion dates, legacy preservation, weekly plans and dated progress. No network or emails.",
  );
} finally {
  globals.contestDatabase = previous;
  globalThis.fetch = originalFetch;
  await engine.close();
}
