import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/lib/db/schema";
import type { Database } from "../src/lib/db";
import { adminQuery, getAdminOverview, maskEmail } from "../src/lib/adminData";
import { requireAdmin } from "../src/lib/adminAccess";
import { recordMailEvent } from "../src/lib/reminderQueue";
import { GET as overview } from "../src/app/api/admin/overview/route";
import { GET as access } from "../src/app/api/admin/access/route";

const engine = new PGlite();
const db = drizzle(engine, { schema }) as unknown as Database;
const globals = globalThis as typeof globalThis & { contestDatabase?: Database };
const oldDatabase = globals.contestDatabase;
const oldFetch = globalThis.fetch;
const now = new Date();
const due = new Date(now.getTime() - 3600000);
process.env.ADMIN_AUTH_USER_IDS = "admin-auth-id";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://admin-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
let identity = "admin-auth-id";
let confirmed = true;
globalThis.fetch = async () => Response.json({ id: identity, email: "owner@example.test", email_confirmed_at: confirmed ? now.toISOString() : null, user_metadata: { role: "admin", authId: "admin-auth-id" }, identities: [] });
globals.contestDatabase = db;
try {
  for (const file of (await readdir("drizzle")).filter((file) => file.endsWith(".sql")).sort()) await engine.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(schema.users).values({ id: "owner" });
  await db.insert(schema.contests).values({ id: 1, event: "Round one", href: "https://example.test/contest", host: "codeforces.com", start: new Date(now.getTime() + 3600000), duration: 7200 });
  const rows = await db.insert(schema.deliveries).values([
    { userId: "owner", contestId: 1, reminderType: "1h", email: "owner@example.test", event: "Delivered round", href: "https://example.test/contest", contestStart: new Date(now.getTime() + 3600000), dueAt: due, createdAt: now, status: "scheduled", providerId: "provider-delivered" },
    { userId: "owner", contestId: 1, reminderType: "1h", email: "owner@example.test", event: "Future round", href: "https://example.test/contest", contestStart: new Date(now.getTime() + 7200000), dueAt: new Date(now.getTime() + 3600000), createdAt: now, status: "scheduled" },
    { userId: "owner", contestId: 1, reminderType: "1h", email: "owner@example.test", event: "Overdue round", href: "https://example.test/contest", contestStart: new Date(now.getTime() + 3600000), dueAt: due, createdAt: now, status: "pending" },
    { userId: "owner", contestId: 1, reminderType: "1h", email: "owner@example.test", event: "Old failed round", href: "https://example.test/contest", contestStart: due, dueAt: due, createdAt: new Date(now.getTime() - 40 * 86400000), status: "failed" },
  ]).returning();
  await recordMailEvent(db, { id: "sent-one", providerId: "provider-delivered", type: "email.sent", occurredAt: new Date(due.getTime() + 10000) });
  await recordMailEvent(db, { id: "delivered-one", providerId: "provider-delivered", type: "email.delivered", occurredAt: new Date(due.getTime() + 15000) });
  await recordMailEvent(db, { id: "sent-one", providerId: "provider-delivered", type: "email.sent", occurredAt: new Date(due.getTime() + 10000) });
  const snapshot = await getAdminOverview(db, adminQuery(new URLSearchParams()), now);
  assert.equal(snapshot.summary.total, 3);
  assert.equal(snapshot.summary.delivered, 1);
  assert.equal(snapshot.summary.timingSamples, 1);
  assert.equal(snapshot.summary.meanSendOffset, 10, "Use provider time, never webhook receipt time");
  assert.equal(snapshot.attention.failed, 1, "Old unresolved failures remain visible");
  assert.equal(snapshot.attention.overdue, 1);
  assert.equal(snapshot.attention.awaitingOutcome, 0, "Future schedules are not overdue");
  assert.equal(snapshot.health.cron, null, "Missing scheduler privileges/schema is unknown, not healthy");
  assert.equal(snapshot.health.lastWorker, null);
  assert.equal(snapshot.health.webhookEvents, 2, "Duplicate webhooks do not inflate counts");
  assert.ok(snapshot.logs.every((row) => row.email === "ow•••@example.test"));
  assert.ok(snapshot.logs.every((row) => /^\d{4}-\d\d-\d\dT.*Z$/.test(row.dueAt)), "Timestamp formats are normalized for browsers");
  assert.ok(!JSON.stringify(snapshot).includes('"providerPayload"'));
  assert.equal((await getAdminOverview(db, adminQuery(new URLSearchParams("status=attention")), now)).totalLogs, 2);
  assert.equal((await getAdminOverview(db, adminQuery(new URLSearchParams("search=Delivered")), now)).totalLogs, 1);
  assert.equal((await getAdminOverview(db, adminQuery(new URLSearchParams({ search: "%' OR 1=1 --" })), now)).totalLogs, 0);
  assert.equal((await getAdminOverview(db, adminQuery(new URLSearchParams("page=2")), now)).logs.length, 0);
  assert.equal(maskEmail("x@example.test"), "x•••@example.test");
  assert.throws(() => adminQuery(new URLSearchParams("days=999")));
  assert.throws(() => adminQuery(new URLSearchParams("status=anything")));
  assert.throws(() => adminQuery(new URLSearchParams("page=-1")));
  assert.throws(() => requireAdmin({ authId: "admin-auth-id", uid: "legacy-owner", email_verified: false }));
  assert.throws(() => requireAdmin({ authId: "another-user", uid: "admin-auth-id", email_verified: true }), "Legacy account ID cannot substitute for Auth identity");
  assert.throws(() => requireAdmin({ authId: "admin-auth-id", uid: "legacy-owner", email_verified: true }, ""));
  const request = () => new Request("http://localhost/api/admin/overview", { headers: { Authorization: "Bearer test-token" } });
  assert.equal((await overview(new Request("http://localhost/api/admin/overview"))).status, 401);
  identity = "regular-user";
  assert.equal((await overview(request())).status, 403, "Metadata role cannot grant admin access");
  assert.equal((await access(request())).status, 403);
  identity = "admin-auth-id"; confirmed = false;
  assert.equal((await overview(request())).status, 403);
  confirmed = true;
  const response = await overview(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  assert.equal((await access(request())).status, 200);
  await engine.exec("create role browser_observer; grant usage on schema public to browser_observer; grant select on all tables in schema public to browser_observer; set role browser_observer");
  assert.equal((await engine.query("select * from mail_events")).rows.length, 0);
  assert.equal((await engine.query("select * from reminder_worker_runs")).rows.length, 0);
  await engine.exec("reset role");
  assert.ok(rows.length);
  console.log("Admin checks passed: verified identity allowlist, 401/403/200 routes, private cache policy, provider timing, deduplication, search/filter/pagination, old failures, unknown health, masked recipients and RLS. No network or emails.");
} finally {
  globals.contestDatabase = oldDatabase;
  globalThis.fetch = oldFetch;
  await engine.close();
}
