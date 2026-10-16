import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import {
  blankJournal,
  journalQuery,
  validateJournal,
  JournalValidationError,
  type JournalEntry,
} from "../src/lib/journal";
import { getJournal } from "../src/lib/journalServer";
import { getContestDay } from "../src/lib/contestCalendar";
import { GET, POST, PUT } from "../src/app/api/journal/route";

const now = new Date(),
  today = getContestDay(now);
const values = {
  ...blankJournal(today),
  title: "LeetCode Weekly Contest",
  host: "leetcode.com",
  href: "https://leetcode.com/contest/weekly-contest/",
  rank: 1200,
  score: "850",
  solved: 2,
  wentWell: "Found the greedy approach early.",
  mistakes: "Spent too long on implementation.",
  lessons: "Draw a small example before coding DP.",
  tags: ["DP", "Greedy"],
  problems: [
    {
      id: "problem-a",
      title: "A. Warmup",
      url: "https://example.test/a",
      done: true,
    },
    {
      id: "problem-c",
      title: "C. Tree paths",
      url: "https://example.test/c",
      done: false,
    },
  ],
  links: [
    {
      id: "editorial",
      label: "Editorial",
      url: "https://example.test/editorial",
    },
  ],
};
assert.deepEqual(validateJournal(values), values);
for (const invalid of [
  { href: "javascript:alert(1)" },
  { href: "https://user:password@example.test" },
  { date: "2026-02-30" },
  { date: "2099-01-01" },
  { rank: 0 },
  { solved: -1 },
  { rank: 1.5 },
  { status: "__proto__" },
  { tags: Array(13).fill("Graphs") },
  { links: [{ id: "bad", label: "Bad", url: "http://example.test" }] },
  { problems: [{ id: "a", title: "A", url: "", done: "false" }] },
  { wentWell: "x".repeat(2001) },
])
  assert.throws(
    () => validateJournal({ ...values, ...invalid }),
    JournalValidationError,
  );
assert.equal(validateJournal({ ...values, solved: 0 }).solved, 0);
assert.throws(() =>
  journalQuery(new URLSearchParams("from=2026-10-20&to=2026-10-01")),
);
assert.throws(() => journalQuery(new URLSearchParams("status=admin")));
assert.throws(() => journalQuery(new URLSearchParams("page=-1")));

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
  const past = new Date(now.getTime() - 2 * 86400000);
  await db.insert(schema.contests).values(
    [1, 2, 3, 4].map((id) => ({
      id,
      event: `Stored round ${id}`,
      host: "codeforces.com",
      href: "https://codeforces.com/contest/1",
      start: id === 4 ? new Date(now.getTime() + 86400000) : past,
      duration: 7200,
    })),
  );
  await db.insert(schema.bookmarks).values([
    { userId: "alice", contestId: 1 },
    { userId: "bob", contestId: 2 },
    { userId: "alice", contestId: 4 },
  ]);
  await db.insert(schema.deliveries).values({
    userId: "alice",
    contestId: 3,
    reminderType: "1h",
    email: "private@example.test",
    event: "Old round",
    href: "https://example.test",
    dueAt: past,
    contestStart: past,
    providerPayload: { private: "Never expose" },
  });
  globals.contestDatabase = db;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://journal-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  globalThis.fetch = async () =>
    Response.json({
      id: authId,
      email: `${authId}@example.test`,
      email_confirmed_at: now.toISOString(),
      user_metadata: {},
      identities: [],
    });
  function request(method = "GET", body?: unknown, query = "") {
    return new Request(
      `http://localhost/api/journal${query ? "?" + query : ""}`,
      {
        method,
        headers: {
          Authorization: "Bearer fake-token",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  }
  assert.equal(
    (await GET(new Request("http://localhost/api/journal"))).status,
    401,
  );
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/journal", { method: "POST" }),
      )
    ).status,
    401,
  );
  assert.equal(
    (await PUT(new Request("http://localhost/api/journal", { method: "PUT" })))
      .status,
    401,
  );
  const initial = await (await GET(request())).json();
  assert.deepEqual(
    initial.candidates.map((c: { id: number }) => c.id).sort(),
    [1, 3],
    "Only owned started contests are offered; reminder history works after removal",
  );
  assert.ok(!JSON.stringify(initial).includes("private@example.test"));
  assert.ok(!JSON.stringify(initial).includes("Never expose"));
  const createdResponse = await POST(
    request("POST", { values, userId: "bob" }),
  );
  assert.equal(createdResponse.status, 201);
  assert.equal(
    createdResponse.headers.get("Cache-Control"),
    "private, no-store",
  );
  const created: JournalEntry = await createdResponse.json();
  assert.equal(created.revision, 0);
  assert.equal(created.values.lessons, values.lessons);
  const prefilledResponse = await POST(
    request("POST", {
      values: {
        ...values,
        contestId: 1,
        title: "Tampered title",
        host: "evil.test",
      },
    }),
  );
  assert.equal(prefilledResponse.status, 201);
  const prefilled: JournalEntry = await prefilledResponse.json();
  assert.equal(prefilled.values.title, "Stored round 1");
  assert.equal(prefilled.values.host, "codeforces.com");
  assert.equal(
    (await POST(request("POST", { values: { ...values, contestId: 1 } })))
      .status,
    409,
    "Duplicate prefills are rejected",
  );
  assert.equal(
    (await POST(request("POST", { values: { ...values, contestId: 2 } })))
      .status,
    404,
    "Cannot prefill another account’s contest",
  );
  assert.equal(
    (await POST(request("POST", { values: { ...values, contestId: 4 } })))
      .status,
    400,
    "Upcoming contests are not logged automatically",
  );
  authId = "bob";
  assert.equal(
    (await (await GET(request("GET", undefined, "uid=alice"))).json()).total,
    0,
  );
  assert.equal(
    (await PUT(request("PUT", { id: created.id, revision: 0, values }))).status,
    404,
  );
  authId = "alice";
  const updatedResponse = await PUT(
    request("PUT", {
      id: created.id,
      revision: 0,
      values: {
        ...values,
        lessons: "New lesson",
        problems: values.problems.map((p) => ({ ...p, done: true })),
      },
    }),
  );
  assert.equal(updatedResponse.status, 200);
  const updated: JournalEntry = await updatedResponse.json();
  assert.equal(updated.revision, 1);
  assert.equal(
    updated.values.solved,
    2,
    "Upsolving checklist does not rewrite contest results",
  );
  assert.equal(
    (await PUT(request("PUT", { id: created.id, revision: 0, values }))).status,
    409,
    "Stale edits cannot overwrite saved notes",
  );
  assert.equal(
    (
      await PUT(
        request("PUT", {
          id: created.id,
          revision: 1,
          values: { ...values, contestId: 1 },
        }),
      )
    ).status,
    400,
    "An entry cannot be reassigned to another source",
  );
  const bad = await POST(request("POST", { values: { ...values, rank: -2 } }));
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).fields.rank);
  const oversize = new Request("http://localhost/api/journal", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token", "Content-Length": "99999" },
    body: "{}",
  });
  assert.equal((await POST(oversize)).status, 413);
  const own = await getJournal(
    db,
    "alice",
    journalQuery(new URLSearchParams()),
  );
  assert.equal(own.stats.total, 2);
  assert.equal(own.stats.participated, 2);
  assert.equal(own.stats.pendingProblems, 1);
  assert.equal(own.candidates.find((c) => c.id === 1)?.entryId, prefilled.id);
  assert.equal(
    (
      await getJournal(
        db,
        "alice",
        journalQuery(
          new URLSearchParams(
            "platform=leetcode.com&topic=DP&status=participated",
          ),
        ),
      )
    ).total,
    1,
  );
  assert.equal(
    (
      await getJournal(
        db,
        "alice",
        journalQuery(new URLSearchParams("q=New+lesson")),
      )
    ).total,
    1,
  );
  assert.equal(
    (
      await getJournal(
        db,
        "alice",
        journalQuery(new URLSearchParams({ q: "%' OR 1=1 --" })),
      )
    ).total,
    0,
  );
  assert.equal(
    (
      await getJournal(
        db,
        "alice",
        journalQuery(new URLSearchParams(`from=${today}&to=${today}`)),
      )
    ).total,
    1,
    "Date range is inclusive for IST contest dates",
  );
  const extra = {
    ...values,
    status: "skipped" as const,
    problems: [],
    tags: [],
    links: [],
  };
  const { title, host, date, href, contestId, ...data } = {
    ...extra,
    date: today,
  };
  await db.insert(schema.journalEntries).values(
    Array.from({ length: 22 }, (_, index) => ({
      userId: "alice",
      title: `Extra ${index}`,
      host,
      date,
      href,
      contestId,
      data,
    })),
  );
  const page2 = await getJournal(
    db,
    "alice",
    journalQuery(new URLSearchParams("page=2")),
  );
  assert.equal(page2.entries.length, 4);
  assert.equal(page2.total, 24);
  assert.ok(page2.entries.every((entry) => !Object.hasOwn(entry, "userId")));
  await engine.exec(
    "update contests set event='Later feed title', start=now()+interval '1 day' where id=1; delete from bookmarks where user_id='alice' and contest_id=1",
  );
  const historical = await PUT(
    request("PUT", {
      id: prefilled.id,
      revision: 0,
      values: {
        ...prefilled.values,
        lessons: "A historical note remains editable.",
      },
    }),
  );
  assert.equal(
    historical.status,
    200,
    "Removing a bookmark or changing the feed cannot block journal edits",
  );
  assert.equal(
    (await historical.json()).values.title,
    "Stored round 1",
    "Linked contest details remain a historical snapshot",
  );
  assert.equal(
    (
      await PUT(
        request("PUT", { id: created.id, revision: 9000000000, values }),
      )
    ).status,
    400,
  );
  await engine.exec(
    "create role journal_browser; grant usage on schema public to journal_browser; grant select,insert on journal_entries to journal_browser; set role journal_browser",
  );
  assert.equal(
    (await engine.query("select * from journal_entries")).rows.length,
    0,
    "RLS denies direct browser reads",
  );
  await assert.rejects(
    () =>
      engine.query(
        "insert into journal_entries(user_id,title,host,contest_date,data) values ('alice','Denied','example.test','2026-10-14','{}')",
      ),
    "Browser inserts are denied by RLS",
  );
  await engine.exec("reset role");
  console.log(
    "Journal checks passed: private API, owner isolation, input limits/HTTPS links, canonical prefills, manual results, historical candidates, duplicate prevention, revision conflicts, independent checklists, search/topics/status/date filters, pagination and RLS. No network or emails.",
  );
} finally {
  globals.contestDatabase = previous;
  globalThis.fetch = originalFetch;
  await engine.close();
}
