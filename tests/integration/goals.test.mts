import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import type { Database } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import { blankJournal } from "../../src/features/journal/lib/journal";
import {
  goalWeek,
  goalPercent,
  validateGoals,
} from "../../src/features/goals/lib/goals";
import {
  getWeeklyGoals,
  saveWeeklyGoals,
} from "../../src/features/goals/server/goals";
import { GET, PUT } from "../../src/app/api/goals/route";

const now = new Date("2026-10-24T04:30:00Z"),
  week = goalWeek(now);
assert.equal(week.start, "2026-10-19");
assert.equal(week.end, "2026-10-25");
assert.equal(goalWeek(new Date("2026-10-25T18:29:59Z")).start, "2026-10-19");
assert.equal(goalWeek(new Date("2026-10-25T18:30:00Z")).start, "2026-10-26");
assert.equal(goalWeek(new Date("2026-12-31T00:00:00Z")).end, "2027-01-03");
assert.equal(goalWeek(new Date("2027-01-03T18:30:00Z")).start, "2027-01-04");
assert.equal(goalWeek(new Date("2024-02-29T00:00:00Z")).start, "2024-02-26");
assert.equal(goalPercent(7, 5), 100);
assert.equal(goalPercent(1, 0), 0);
assert.equal(goalPercent(1, 4), 25);
const input = {
  weekStart: week.start,
  revision: null,
  contests: 2,
  problems: 5,
};
for (const patch of [
  { contests: -1 },
  { contests: 22 },
  { contests: 1.5 },
  { contests: "2" },
  { problems: 501 },
  { problems: null },
  { revision: -1 },
  { revision: 1.5 },
  { revision: undefined },
])
  assert.throws(() => validateGoals({ ...input, ...patch }, now));
assert.throws(
  () => validateGoals({ ...input, weekStart: "2026-10-12" }, now),
  /new week/,
);
assert.equal(
  validateGoals({ ...input, contests: 0, problems: 0 }, now).contests,
  0,
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
  const {
    title: _title,
    host: _host,
    date: _date,
    href: _href,
    contestId: _contestId,
    ...review
  } = blankJournal("2026-10-20");
  const common = {
    userId: "alice",
    host: "example.test",
    href: "",
    data: review,
  };
  await db.insert(schema.journalEntries).values([
    ...Array.from({ length: 26 }, (_, i) => ({
      ...common,
      title: `Round ${i}`,
      date: "2026-10-20",
    })),
    {
      ...common,
      title: "Skipped",
      date: "2026-10-21",
      data: { ...review, status: "skipped" as const },
    },
    {
      ...common,
      title: "To upsolve",
      date: "2026-10-22",
      data: { ...review, status: "upsolving" as const },
    },
    { ...common, title: "Before this week", date: "2026-10-18" },
    { ...common, title: "Future contest date", date: "2026-10-25" },
    {
      ...common,
      userId: "bob",
      title: "Bob private round",
      date: "2026-10-20",
    },
  ]);
  const [practice] = await db
    .insert(schema.journalEntries)
    .values({
      ...common,
      title: "Old contest, new practice",
      date: "2024-01-01",
      data: {
        ...review,
        status: "upsolving",
        lessons: "Private notes must not be exposed",
        problems: [
          {
            id: "a",
            title: "A",
            url: "",
            done: true,
            completedAt: week.startAt,
          },
          {
            id: "b",
            title: "B",
            url: "",
            done: true,
            completedAt: "2026-10-21T08:00:00Z",
          },
          {
            id: "c",
            title: "C",
            url: "",
            done: true,
            completedAt: now.toISOString(),
          },
          {
            id: "d",
            title: "Before week",
            url: "",
            done: true,
            completedAt: "2026-10-18T18:29:59Z",
          },
          { id: "e", title: "Unknown date", url: "", done: true },
          {
            id: "f",
            title: "Reopened",
            url: "",
            done: false,
            completedAt: now.toISOString(),
          },
          {
            id: "g",
            title: "Not yet",
            url: "",
            done: true,
            completedAt: "2026-10-25T08:00:00Z",
          },
        ],
      },
    })
    .returning();
  let snapshot = await getWeeklyGoals(db, "alice", now);
  assert.deepEqual(
    snapshot.counts,
    { contests: 26, problems: 3 },
    "Uses all owner records, correct statuses, IST boundaries and completion dates independent of contest dates",
  );
  assert.deepEqual(snapshot.targets, { contests: 0, problems: 0 });
  assert.equal(snapshot.revision, null);
  assert.ok(!JSON.stringify(snapshot).includes("Private notes"));
  snapshot = await saveWeeklyGoals(db, "alice", input, now);
  assert.equal(snapshot.revision, 0);
  assert.deepEqual(snapshot.targets, { contests: 2, problems: 5 });
  await assert.rejects(
    () => saveWeeklyGoals(db, "alice", input, now),
    /another tab/,
  );
  snapshot = await saveWeeklyGoals(
    db,
    "alice",
    { ...input, revision: 0, contests: 1, problems: 0 },
    now,
  );
  assert.equal(snapshot.revision, 1);
  assert.equal(snapshot.targets.problems, 0);
  await assert.rejects(
    () => saveWeeklyGoals(db, "alice", { ...input, revision: 0 }, now),
    /another tab/,
  );
  const bob = await getWeeklyGoals(db, "bob", now);
  assert.equal(bob.revision, null);
  assert.deepEqual(bob.counts, { contests: 1, problems: 0 });
  const nextMonday = new Date("2026-10-25T18:30:00Z");
  const next = await getWeeklyGoals(db, "alice", nextMonday);
  assert.equal(next.revision, null);
  assert.deepEqual(next.targets, { contests: 0, problems: 0 });
  assert.deepEqual(next.counts, { contests: 0, problems: 0 });
  await assert.rejects(
    () => saveWeeklyGoals(db, "alice", input, nextMonday),
    /new week/,
  );
  assert.equal(
    (await getWeeklyGoals(db, "alice", now)).targets.contests,
    1,
    "A new week does not rewrite old targets",
  );
  await db
    .update(schema.journalEntries)
    .set({
      data: {
        ...practice.data,
        problems: practice.data.problems.map((p) =>
          p.id === "b" ? { ...p, done: false, completedAt: null } : p,
        ),
      },
    })
    .where(eq(schema.journalEntries.id, practice.id));
  assert.equal(
    (await getWeeklyGoals(db, "alice", now)).counts.problems,
    2,
    "Reopened practice is excluded from current completions",
  );
  await assert.rejects(() =>
    db
      .insert(schema.weeklyGoals)
      .values({ userId: "bob", weekStart: week.start, contests: 22 }),
  );
  await assert.rejects(() =>
    db
      .insert(schema.weeklyGoals)
      .values({ userId: "bob", weekStart: "2026-10-20" }),
  );
  globals.contestDatabase = db;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://goals-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  globalThis.fetch = async () =>
    Response.json({
      id: authId,
      email_confirmed_at: now.toISOString(),
      user_metadata: {},
      identities: [],
    });
  const request = (method = "GET", body?: unknown) =>
    new Request("http://localhost/api/goals?uid=bob", {
      method,
      headers: {
        Authorization: "Bearer fake",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal(
    (await GET(new Request("http://localhost/api/goals"))).status,
    401,
  );
  assert.equal(
    (await PUT(new Request("http://localhost/api/goals", { method: "PUT" })))
      .status,
    401,
  );
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  const current = await response.json();
  const update = {
    weekStart: current.week.start,
    revision: current.revision,
    contests: 2,
    problems: 5,
    userId: "bob",
  };
  assert.equal((await PUT(request("PUT", update))).status, 200);
  assert.equal((await PUT(request("PUT", update))).status, 409);
  assert.equal(
    (await PUT(request("PUT", { ...update, contests: -1 }))).status,
    400,
  );
  assert.equal(
    (await PUT(request("PUT", { ...update, padding: "x".repeat(3000) })))
      .status,
    413,
  );
  assert.equal(
    (
      await PUT(
        new Request("http://localhost/api/goals", {
          method: "PUT",
          headers: { Authorization: "Bearer fake" },
          body: "{",
        }),
      )
    ).status,
    400,
  );
  authId = "bob";
  const privateSnapshot = await (await GET(request())).json();
  assert.equal(
    privateSnapshot.revision,
    null,
    "A supplied owner ID cannot overwrite another account",
  );
  await engine.exec(
    "create role goals_browser; grant usage on schema public to goals_browser; grant select,insert,update on weekly_goals to goals_browser; set role goals_browser",
  );
  assert.equal(
    (await engine.query("select * from weekly_goals")).rows.length,
    0,
    "RLS denies direct browser reads",
  );
  await assert.rejects(() =>
    engine.query(
      "insert into weekly_goals(user_id,week_start) values('bob','2026-10-19')",
    ),
  );
  await engine.exec("reset role");
  console.log(
    "Weekly goals checks passed: authenticated private API, owner isolation, all-entry counts, IST Monday/Sunday/year/leap boundaries, missing completion dates, reopened problems, validation, database constraints, revision conflicts, rollover and RLS. No network or emails.",
  );
} finally {
  globals.contestDatabase = previous;
  globalThis.fetch = originalFetch;
  await engine.close();
}
