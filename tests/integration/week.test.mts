import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import { getWeekPlan } from "../../src/features/week/server/week";
import {
  weekWindow,
  weekRounds,
  weekOverlaps,
  type WeekItem,
} from "../../src/features/week/lib/week";
import { GET } from "../../src/app/api/week/route";

const now = Date.parse("2026-10-14T04:30:00Z"); // 10am IST
const window = weekWindow(now);
assert.equal(window.today, "2026-10-14");
assert.equal(new Date(window.start).toISOString(), "2026-10-13T18:30:00.000Z");
assert.equal(new Date(window.end).toISOString(), "2026-10-20T18:30:00.000Z");
assert.equal(
  weekWindow(Date.parse("2026-10-14T19:00:00Z")).today,
  "2026-10-15",
  "IST midnight is independent of UTC midnight",
);
const item = (id: number, start: string, duration: number): WeekItem => ({
  contest: {
    id,
    event: `Round ${id}`,
    start,
    duration,
    href: "https://example.test/contest",
    host: "codeforces.com",
  },
  bookmarked: true,
  reminder: null,
});
const rounds = weekRounds(
  [
    item(1, "2026-10-14T05:30:00Z", 7200), // 11am to1pm
    item(2, "2026-10-14T06:30:00Z", 7200), // noon to2pm
    item(3, "2026-10-14T08:30:00Z", 3600), // 2pm to3pm, touches2
    item(4, "2026-10-14T05:00:00Z", 0), // duration unknown
    item(5, "2026-10-13T18:00:00Z", 86400), // ongoing overnight, shown today
    item(6, "2026-10-20T18:30:00Z", 3600), // firstinstant outsidewindow
    item(7, "2026-10-14T01:30:00Z", 3600), // ended
  ],
  [],
  now,
);
assert.equal(rounds.length, 5);
assert.equal(rounds[0].contest.id, 5);
assert.equal(rounds[0].live, true);
assert.equal(rounds[0].day, window.today);
const pairs = weekOverlaps(rounds, now);
assert.equal(
  pairs.find(
    (pair) => pair.first.contest.id === 1 && pair.second.contest.id === 2,
  )?.minutes,
  60,
);
assert.ok(
  !pairs.some(
    (pair) => pair.first.contest.id === 2 && pair.second.contest.id === 3,
  ),
  "Touching endpoints do not overlap",
);
assert.ok(
  !pairs.some(
    (pair) => pair.first.contest.id === 4 || pair.second.contest.id === 4,
  ),
  "Unknown durations are not guessed",
);
const changed = {
  ...item(9, "2026-10-14T05:30:00Z", 3600),
  reminder: {
    type: "1h" as const,
    status: "scheduled",
    dueAt: "2026-10-14T04:30:00Z",
    contestStart: "2026-10-14T05:30:00Z",
  },
};
assert.equal(
  weekRounds(
    [changed],
    [{ ...changed.contest, start: "2026-10-14T06:30:00Z" }],
    now,
  )[0].scheduleChanged,
  true,
);
assert.equal(
  weekRounds([changed], [], now)[0].contest.start,
  changed.contest.start,
  "Saved schedule survives a feed outage",
);

const engine = new PGlite();
const db = drizzle(engine, { schema }) as unknown as Database;
const globals = globalThis as typeof globalThis & {
  contestDatabase?: Database;
};
const original = globals.contestDatabase;
const originalFetch = globalThis.fetch;
try {
  for (const file of (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await engine.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(schema.users).values([{ id: "alice" }, { id: "bob" }]);
  const start = new Date(Date.now() + 86400000);
  await db.insert(schema.contests).values(
    [1, 2, 3].map((id) => ({
      id,
      event: `Contest ${id}`,
      host: "leetcode.com",
      href: "https://example.test",
      start,
      duration: 7200,
    })),
  );
  await db.insert(schema.bookmarks).values([
    { userId: "alice", contestId: 1 },
    { userId: "bob", contestId: 2 },
  ]);
  const [delivery] = await db
    .insert(schema.deliveries)
    .values({
      userId: "alice",
      contestId: 1,
      reminderType: "1h",
      email: "alice@example.test",
      event: "Contest 1",
      href: "https://example.test",
      dueAt: new Date(start.getTime() - 3600000),
      contestStart: start,
      providerPayload: { privateBody: "Do not disclose" },
    })
    .returning();
  const [reminderOnly] = await db
    .insert(schema.deliveries)
    .values({
      userId: "alice",
      contestId: 3,
      reminderType: "6h",
      email: "alice@example.test",
      event: "Contest 3",
      href: "https://example.test",
      dueAt: new Date(start.getTime() - 6 * 3600000),
      contestStart: start,
    })
    .returning();
  await db.insert(schema.reminders).values([
    { userId: "alice", contestId: 1, deliveryId: delivery.id },
    { userId: "alice", contestId: 3, deliveryId: reminderOnly.id },
  ]);
  const plan = await getWeekPlan(db, "alice");
  assert.deepEqual(
    plan.items.map((row) => row.contest.id),
    [1, 3],
    "Owner-scoped bookmark/reminder union deduplicates contests",
  );
  assert.equal(plan.items[0].bookmarked, true);
  assert.equal(plan.items[1].bookmarked, false);
  assert.equal(plan.items[0].reminder?.status, "pending");
  assert.ok(!JSON.stringify(plan).includes("alice@example.test"));
  assert.ok(!JSON.stringify(plan).includes("privateBody"));
  assert.equal((await getWeekPlan(db, "nobody")).items.length, 0);
  globals.contestDatabase = db;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://week-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  let authId = "alice";
  globalThis.fetch = async () =>
    Response.json({
      id: authId,
      email_confirmed_at: start.toISOString(),
      user_metadata: {},
      identities: [],
    });
  assert.equal(
    (await GET(new Request("http://localhost/api/week"))).status,
    401,
  );
  const request = new Request("http://localhost/api/week?uid=bob", {
    headers: { Authorization: "Bearer fake-test-token" },
  });
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  assert.deepEqual(
    (await response.json()).items.map((row: WeekItem) => row.contest.id),
    [1, 3],
    "Client parameters cannot select another account",
  );
  authId = "bob";
  assert.deepEqual(
    (await (await GET(request)).json()).items.map(
      (row: WeekItem) => row.contest.id,
    ),
    [2],
  );
  console.log(
    "My week checks passed: account isolation, private API, bookmark/reminder union, no private mail fields, IST boundaries, overnight/live rounds, exact overlaps, unknown durations and schedule changes. No network or emails.",
  );
} finally {
  globals.contestDatabase = original;
  globalThis.fetch = originalFetch;
  await engine.close();
}
