import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { Database } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import {
  DEFAULT_DISCOVERY,
  recommendContests,
  validateDiscovery,
} from "../../src/features/contests/lib/discovery";
import {
  getSettings,
  saveSettings,
} from "../../src/features/account/server/settings";
import { exportAccount } from "../../src/features/account/server/export";
import { GET, PUT } from "../../src/app/api/account/settings/route";
import type { Contest } from "../../src/features/contests/types";

const now = Date.parse("2026-10-30T10:00:00Z");
const contest = (
  id: number,
  start: string,
  host = "codeforces.com",
  duration = 7200,
): Contest => ({
  id,
  start,
  host,
  duration,
  event: `Round ${id}`,
  href: `https://${host}/contest/${id}`,
});
const feed = [
  contest(1, "2026-10-30T11:00:00Z", "atcoder.jp"),
  contest(2, "2026-10-30T14:30:00Z"), // Friday 8pm IST.
  contest(3, "2026-10-30T20:30:00Z"), // Saturday 2am IST.
  contest(4, "2026-10-30T09:00:00Z"), // Already started.
  contest(5, "invalid"),
];
const preferences = validateDiscovery({
  enabled: true,
  platforms: ["codeforces.com"],
  days: [5],
  time: "evening",
  maxMinutes: 120,
});
const ranked = recommendContests(feed, preferences, now);
assert.equal(ranked[0].contest.id, 2);
assert.deepEqual(ranked[0].reasons, [
  "Favourite platform",
  "Fits your days",
  "Fits your start time",
  "Within 2h",
]);
assert.ok(!ranked.find((pick) => [4, 5].includes(pick.contest.id)));
assert.equal(
  recommendContests(feed, { ...preferences, enabled: false }, now)[0].contest
    .id,
  1,
);
assert.equal(recommendContests(feed, DEFAULT_DISCOVERY, now)[0].contest.id, 1);
assert.deepEqual(recommendContests([], preferences, now), []);
const noMatches = recommendContests(
  [feed[0]],
  { ...DEFAULT_DISCOVERY, platforms: ["leetcode.com"] },
  now,
);
assert.equal(
  noMatches[0].contest.id,
  1,
  "No-match fallback retains upcoming contests",
);
assert.equal(noMatches[0].score, 0);
assert.deepEqual(noMatches[0].reasons, []);
assert.equal(feed.length, 5, "Ranking does not mutate the source calendar");

const istNight = recommendContests(
  [feed[2]],
  { ...DEFAULT_DISCOVERY, days: [6], time: "night" },
  now,
)[0];
assert.deepEqual(
  istNight.reasons,
  ["Fits your days", "Fits your start time"],
  "UTC Friday night is Saturday in IST",
);
assert.ok(
  !recommendContests(
    [contest(6, "2026-10-31T10:00:00Z", "codeforces.com", 0)],
    preferences,
    now,
  )[0].reasons.includes("Within 2h"),
  "Unknown duration must not claim it fits",
);
assert.equal(recommendContests([feed[0], feed[0]], preferences, now).length, 1);
assert.equal(
  recommendContests(
    [contest(7, "2026-10-31T12:30:00Z")],
    preferences,
    now,
  )[0].reasons.includes("Fits your start time"),
  true,
  "6pm IST is evening",
);
assert.equal(
  recommendContests(
    [contest(7, "2026-10-31T06:30:00Z")],
    { ...preferences, time: "afternoon" },
    now,
  )[0].reasons.includes("Fits your start time"),
  true,
  "12pm IST is afternoon",
);
assert.deepEqual(
  validateDiscovery({
    ...preferences,
    platforms: ["codeforces.com", "codeforces.com"],
    days: [5, 5],
  }),
  preferences,
);
for (const patch of [
  { days: [7] },
  { days: ["5"] },
  { time: "__proto__" },
  { maxMinutes: "120" },
  { maxMinutes: -1 },
  { platforms: ["https://evil.test"] },
  { platforms: Array(13).fill("codeforces.com") },
  { enabled: "true" },
])
  assert.throws(() => validateDiscovery({ ...preferences, ...patch }));

const engine = new PGlite();
const db = drizzle(engine, { schema }) as unknown as Database;
const cache = globalThis as typeof globalThis & { contestDatabase?: Database };
const previous = cache.contestDatabase;
const previousFetch = globalThis.fetch;
let uid = "alice";
try {
  for (const file of (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await engine.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(schema.users).values([{ id: "alice" }, { id: "bob" }]);
  cache.contestDatabase = db;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://discovery-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  globalThis.fetch = async () =>
    Response.json({
      id: uid,
      email: `${uid}@example.test`,
      email_confirmed_at: new Date(now).toISOString(),
      user_metadata: {},
      identities: [],
    });
  const request = (method = "GET", body?: unknown) =>
    new Request("http://localhost/api/account/settings", {
      method,
      headers: {
        Authorization: "Bearer fake-token",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal(
    (await GET(new Request("http://localhost/api/account/settings"))).status,
    401,
  );
  assert.equal(
    (
      await PUT(
        new Request("http://localhost/api/account/settings", { method: "PUT" }),
      )
    ).status,
    401,
  );
  let settings = await getSettings(db, "alice");
  assert.deepEqual(settings.discovery, DEFAULT_DISCOVERY);
  const saved = await PUT(
    request("PUT", { ...settings, discovery: preferences, userId: "bob" }),
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("Cache-Control"), "private, no-store");
  settings = await saved.json();
  assert.deepEqual(settings.discovery, preferences);
  assert.deepEqual((await getSettings(db, "bob")).discovery, DEFAULT_DISCOVERY);
  assert.deepEqual(
    (await exportAccount(db, "alice")).preferences?.discovery,
    preferences,
  );
  assert.equal(
    (await PUT(request("PUT", { ...settings, revision: null }))).status,
    409,
  );
  assert.equal(
    (
      await PUT(
        request("PUT", {
          ...settings,
          discovery: { ...preferences, days: [8] },
        }),
      )
    ).status,
    400,
  );
  const { discovery: omitted, ...legacy } = settings;
  void omitted;
  settings = await saveSettings(db, "alice", {
    ...legacy,
    defaultReminder: "3h",
  });
  assert.deepEqual(
    settings.discovery,
    preferences,
    "Older clients editing reminders preserve discovery choices",
  );
  assert.equal(settings.defaultReminder, "3h");
  uid = "bob";
  assert.deepEqual(
    (await (await GET(request())).json()).discovery,
    DEFAULT_DISCOVERY,
  );
  assert.equal(
    (await db.select().from(schema.reminders)).length,
    0,
    "Personalisation never creates reminders",
  );
  const rls = await engine.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where relname='account_preferences'",
  );
  assert.equal(rls.rows[0].relrowsecurity, true);
  console.log(
    "Discovery checks passed: explicit ranking/reasons, IST boundaries, disabled/default/no-match behavior, duplicates, invalid inputs, private authenticated persistence, account isolation, revision conflicts, export and legacy preference preservation. No network or emails.",
  );
} finally {
  cache.contestDatabase = previous;
  globalThis.fetch = previousFetch;
  await engine.close();
}
