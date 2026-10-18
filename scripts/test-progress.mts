import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import {
  aggregateProgress,
  progressQuery,
  progressWindow,
  progressJournalLink,
  type ProgressRecord,
  type ProgressSnapshot,
} from "../src/lib/progress";
import { getProgress } from "../src/lib/progressServer";
import { blankJournal, journalQuery } from "../src/lib/journal";
import { GET } from "../src/app/api/progress/route";

const now = new Date("2026-10-18T04:30:00Z");
const query = progressQuery(new URLSearchParams());
assert.deepEqual(query, { months: 6, platform: "" });
assert.equal(progressWindow(6, now).from, "2026-05-01");
assert.equal(
  progressWindow(3, new Date("2026-12-31T18:30:00Z")).to,
  "2027-01-01",
);
assert.equal(
  progressWindow(3, new Date("2026-12-31T18:29:59Z")).from,
  "2026-10-01",
);
assert.equal(
  progressWindow(12, new Date("2026-01-01T00:00:00Z")).from,
  "2025-02-01",
);
assert.equal(
  progressWindow(3, new Date("2024-03-01T00:00:00Z")).monthly[1].to,
  "2024-02-29",
);
for (const value of ["1", "0", "-1", "NaN", "6.5", "13"])
  assert.throws(() => progressQuery(new URLSearchParams({ months: value })));
assert.throws(() =>
  progressQuery(new URLSearchParams({ platform: "bad/platform" })),
);
assert.throws(() =>
  progressQuery(new URLSearchParams({ platform: "x".repeat(101) })),
);
const row = (
  id: string,
  overrides: Partial<ProgressRecord> = {},
): ProgressRecord => ({
  id,
  title: `Round ${id}`,
  host: "codeforces.com",
  date: "2026-10-01",
  status: "participated",
  solved: 2,
  rank: 100,
  problemStates: [true, false],
  tags: ["Graphs"],
  ...overrides,
});
const records = [
  row("a", {
    date: "2026-05-01",
    solved: 0,
    rank: 150,
    tags: ["Graphs", "Graphs"],
  }),
  row("b", { date: "2026-06-30", solved: null, rank: null }),
  row("c", {
    date: "2026-08-08",
    host: "leetcode.com",
    solved: 4,
    rank: 500,
    tags: ["DP"],
  }),
  row("d", { status: "skipped", solved: 999, rank: 1, tags: [] }),
  row("e", { status: "upsolving", solved: 999, rank: 2, tags: ["DP"] }),
  row("f", { date: "2026-10-18", solved: 3, rank: 70 }),
  row("old", { date: "2026-04-30" }),
  row("future", { date: "2026-10-19" }),
];
const summary = aggregateProgress(records, query, now, records.length, [
  "codeforces.com",
  "leetcode.com",
]);
assert.deepEqual(summary.totals, {
  entries: 6,
  participated: 4,
  skipped: 1,
  upsolving: 1,
  solved: 7,
  solvedRecorded: 3,
  checklistTotal: 12,
  checklistDone: 6,
});
assert.equal(summary.monthly.length, 6);
assert.equal(
  summary.monthly[2].entries,
  0,
  "Months without entries are included",
);
assert.equal(summary.monthly[0].solvedRecorded, 1, "A logged zero is recorded");
assert.equal(
  summary.monthly[1].solvedRecorded,
  0,
  "Missing counts stay missing",
);
assert.equal(summary.activeMonths, 4);
assert.equal(
  summary.platforms[0].bestRank,
  70,
  "Skipped/upsolving ranks cannot become the best participated rank",
);
assert.equal(
  summary.topics.find((t) => t.topic === "Graphs")?.entries,
  3,
  "Duplicate tags within one entry count once",
);
assert.equal(summary.recent[0].id, "f");
for (const field of Object.keys(
  summary.totals,
) as (keyof typeof summary.totals)[]) {
  assert.equal(
    summary.monthly.reduce((sum, m) => sum + m[field], 0),
    summary.totals[field],
  );
  assert.equal(
    summary.platforms.reduce((sum, m) => sum + m[field], 0),
    summary.totals[field],
  );
}
const filter = { months: 3, platform: "leetcode.com" };
const filtered = aggregateProgress(records, filter, now, records.length, [
  "codeforces.com",
  "leetcode.com",
]);
assert.equal(filtered.totals.entries, 1);
assert.equal(filtered.totals.solved, 4);
assert.equal(filtered.from, "2026-08-01");
const link = new URL(
  progressJournalLink(summary, {
    topic: "Binary search",
    platform: "leetcode.com",
  }),
  "http://localhost",
);
assert.deepEqual(journalQuery(link.searchParams), {
  q: "",
  host: "leetcode.com",
  status: "",
  topic: "Binary search",
  from: "2026-05-01",
  to: "2026-10-18",
  page: 1,
});
const empty = aggregateProgress([], query, now, 0, []);
assert.equal(empty.journalCount, 0);
assert.ok(empty.monthly.every((m) => m.entries === 0));
assert.ok(!JSON.stringify(empty).includes("NaN"));

const engine = new PGlite();
const db = drizzle(engine, { schema }) as unknown as Database;
const globals = globalThis as typeof globalThis & {
  contestDatabase?: Database;
};
const original = globals.contestDatabase;
const originalFetch = globalThis.fetch;
try {
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await engine.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(schema.users).values([{ id: "alice" }, { id: "bob" }]);
  const insert = async (uid: string, record: ProgressRecord) => {
    const { title, host, date, status, solved, rank, problemStates, tags } =
      record;
    const {
      title: _t,
      host: _h,
      date: _d,
      href: _u,
      contestId: _c,
      ...review
    } = blankJournal(date);
    await db
      .insert(schema.journalEntries)
      .values({
        userId: uid,
        title,
        host,
        date,
        href: "https://private.example.test/round",
        data: {
          ...review,
          status:
            status as keyof typeof import("../src/lib/journal").JOURNAL_STATUSES,
          solved,
          rank,
          tags,
          wentWell: "PRIVATE_JOURNAL_NOTE",
          problems: problemStates.map((done, i) => ({
            id: `p${i}`,
            title: "PRIVATE_PROBLEM_TITLE",
            url: "https://private.example.test/problem",
            done,
          })),
        },
      });
  };
  for (const record of records) await insert("alice", record);
  await insert(
    "bob",
    row("bob-only", { host: "private-bob.test", solved: 4444 }),
  );
  const fromDb = await getProgress(db, "alice", query, now);
  assert.deepEqual(fromDb.totals, summary.totals);
  assert.equal(fromDb.journalCount, records.length);
  assert.deepEqual(fromDb.availablePlatforms, [
    "codeforces.com",
    "leetcode.com",
  ]);
  for (const secret of [
    "PRIVATE_JOURNAL_NOTE",
    "PRIVATE_PROBLEM_TITLE",
    "private.example.test",
    "bob-only",
    "private-bob.test",
    "4444",
  ])
    assert.ok(
      !JSON.stringify(fromDb).includes(secret),
      `${secret} must not be returned`,
    );
  const scope = await getProgress(db, "alice", filter, now);
  assert.equal(scope.totals.entries, 1);
  assert.equal(
    scope.journalCount,
    records.length,
    "All-time owner count distinguishes a new journal from an empty filter",
  );
  assert.equal(
    scope.availablePlatforms.length,
    2,
    "Platform options survive active filters",
  );
  assert.deepEqual(
    (await getProgress(db, "nobody", query, now)).totals,
    empty.totals,
  );
  // The dashboard must aggregate the whole journal, not just its first 20-row page.
  for (let index = 0; index < 25; index++)
    await insert("alice", row(`extra${index}`));
  assert.equal((await getProgress(db, "alice", query, now)).totals.entries, 31);
  globals.contestDatabase = db;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://progress-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  let authId = "alice";
  globalThis.fetch = async () =>
    Response.json({
      id: authId,
      email_confirmed_at: now.toISOString(),
      user_metadata: {},
      identities: [],
    });
  assert.equal(
    (await GET(new Request("http://localhost/api/progress"))).status,
    401,
  );
  const request = (params = "") =>
    new Request(`http://localhost/api/progress?${params}`, {
      headers: { Authorization: "Bearer fake-test-token" },
    });
  const response = await GET(request("months=12&uid=bob"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  const api: ProgressSnapshot = await response.json();
  assert.equal(
    api.journalCount,
    33,
    "Client-supplied uid cannot select another account",
  );
  assert.ok(!api.availablePlatforms.includes("private-bob.test"));
  authId = "bob";
  const bob: ProgressSnapshot = await (await GET(request())).json();
  assert.equal(bob.journalCount, 1);
  assert.deepEqual(bob.availablePlatforms, ["private-bob.test"]);
  assert.equal((await GET(request("months=999"))).status, 400);
  assert.equal((await GET(request("platform=a%2Fb"))).status, 400);
  console.log(
    "Progress checks passed: authenticated owner isolation, private caching, full-journal SQL aggregation, IST/year/leap boundaries, missing vs zero counts, status semantics, checklist states, platform filters, topic deduplication, journal drilldowns and empty states. No network or emails.",
  );
} finally {
  globals.contestDatabase = original;
  globalThis.fetch = originalFetch;
  await engine.close();
}
