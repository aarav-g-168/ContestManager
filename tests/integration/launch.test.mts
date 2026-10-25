import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import type { Database } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import {
  getSettings,
  saveSettings,
} from "../../src/features/account/server/settings";
import {
  exportAccount,
  journalCsv,
} from "../../src/features/account/server/export";
import {
  requestDeletion,
  deletionStatus,
  processAccountDeletions,
} from "../../src/features/account/server/deletion";
import { takeRequestLimit } from "../../src/lib/security/rate-limit";
import { processReminderQueue } from "../../src/features/reminders/server/queue";
import { saveReminder } from "../../src/features/reminders/server/service";
import {
  submitFeedback,
  listFeedback,
  adminFeedback,
  resolveFeedback,
} from "../../src/features/support/server/feedback";
import {
  deleteJournalEntry,
  getJournal,
} from "../../src/features/journal/server/journal";
import {
  blankJournal,
  journalQuery,
} from "../../src/features/journal/lib/journal";
import { inspectHealth } from "../../src/features/operations/server/health";
import { sendOperationalAlert } from "../../src/features/operations/server/alerts";
import {
  REMINDER_OPTIONS,
  reminderOffset,
  isReminderType,
  isSavedReminderType,
} from "../../src/features/reminders/lib/timing";
import {
  BACKUP_TABLES,
  encryptBackup,
  decryptBackup,
  restoreDatabase,
  restoreRows,
  type Backup,
} from "../../scripts/setup/backup-core.mts";
import { GET as settingsGET } from "../../src/app/api/account/settings/route";
import { GET as exportGET } from "../../src/app/api/account/export/route";
import {
  GET as feedbackGET,
  PATCH as feedbackPATCH,
} from "../../src/app/api/admin/feedback/route";
import { GET as healthGET } from "../../src/app/api/health/route";
import { GET as deletionGET } from "../../src/app/api/account/deletion/route";
const engine = new PGlite(),
  restoreEngine = new PGlite();
const db = drizzle(engine, { schema }) as unknown as Database,
  target = drizzle(restoreEngine, { schema }) as unknown as Database;
const globals = globalThis as typeof globalThis & {
  contestDatabase?: Database;
};
const previous = globals.contestDatabase,
  originalFetch = globalThis.fetch;
const now = new Date("2026-10-25T04:00:00Z"),
  later = new Date(now.getTime() + 180000),
  receipt = "a".repeat(64);
const contest = {
  id: 123,
  event: "Round",
  host: "codeforces.com",
  href: "https://codeforces.com/contest/123",
  start: "2026-10-26T04:00:00Z",
  duration: 7200,
};
try {
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(`drizzle/${file}`, "utf8");
    await engine.exec(sql);
    await restoreEngine.exec(sql);
  }
  globals.contestDatabase = db;
  await db.insert(schema.users).values([
    { id: "alice", email: "alice@example.test" },
    { id: "bob", email: "bob@example.test" },
  ]);
  await db
    .insert(schema.contests)
    .values({ ...contest, start: new Date(contest.start) });
  assert.deepEqual([...REMINDER_OPTIONS], ["15m", "1h", "3h"]);
  assert.equal(reminderOffset("15m"), 900000);
  assert.equal(reminderOffset("3h"), 10800000);
  assert.ok(!isReminderType("6h") && isSavedReminderType("6h"));
  let settings = await getSettings(db, "alice");
  assert.equal(settings.defaultReminder, "15m");
  assert.equal(settings.revision, null);
  assert.deepEqual(settings.onboarding, {
    saved: false,
    reminded: false,
    journaled: false,
  });
  settings = await saveSettings(
    db,
    "alice",
    { ...settings, defaultReminder: "3h" },
    now,
  );
  assert.equal(settings.revision, 0);
  await assert.rejects(
    () => saveSettings(db, "alice", { ...settings, revision: null }, now),
    /another tab/,
  );
  await assert.rejects(
    () =>
      saveSettings(db, "alice", { ...settings, defaultReminder: "24h" }, now),
    /valid preferences/,
  );
  const mail = await saveReminder(
    db,
    "alice",
    "alice@example.test",
    contest,
    "15m",
    now,
  );
  let [delivery] = await db
    .select()
    .from(schema.deliveries)
    .where(eq(schema.deliveries.id, mail.id));
  assert.equal(delivery.dueAt.toISOString(), "2026-10-26T03:45:00.000Z");
  settings = await saveSettings(
    db,
    "alice",
    { ...settings, remindersPaused: true },
    now,
  );
  [delivery] = await db
    .select()
    .from(schema.deliveries)
    .where(eq(schema.deliveries.id, mail.id));
  assert.ok(delivery.cancelRequested);
  assert.equal((await db.select().from(schema.reminders)).length, 0);
  await assert.rejects(
    () => saveReminder(db, "alice", "alice@example.test", contest, "1h", now),
    /paused/,
  );
  settings = await saveSettings(
    db,
    "alice",
    { ...settings, remindersPaused: false },
    now,
  );
  assert.equal((await db.select().from(schema.reminders)).length, 0);
  await takeRequestLimit(db, "alice", "test", 2, 60, now);
  await takeRequestLimit(db, "alice", "test", 2, 60, now);
  await assert.rejects(
    () => takeRequestLimit(db, "alice", "test", 2, 60, now),
    (e) => (e as { status: number }).status === 429,
  );
  await takeRequestLimit(db, "bob", "test", 2, 60, now);
  await takeRequestLimit(
    db,
    "alice",
    "test",
    2,
    60,
    new Date(now.getTime() + 60000),
  );
  await assert.rejects(() =>
    submitFeedback(db, "alice", { category: "bug", subject: "", message: "x" }),
  );
  const feedback = await submitFeedback(db, "alice", {
    category: "bug",
    subject: "Need help",
    message: "Only the owner and admin should see this.",
  });
  assert.equal((await listFeedback(db, "bob")).length, 0);
  assert.equal((await adminFeedback(db))[0].email, "alice@example.test");
  await resolveFeedback(db, { id: feedback.id, status: "resolved" });
  assert.equal((await listFeedback(db, "alice"))[0].status, "resolved");
  for (let i = 0; i < 4; i++)
    await submitFeedback(db, "alice", {
      category: "other",
      subject: "A message",
      message: "Private",
    });
  await assert.rejects(
    () =>
      submitFeedback(db, "alice", {
        category: "other",
        subject: "A message",
        message: "Private",
      }),
    (e) => (e as { status: number }).status === 429,
  );
  const {
    title: _t,
    host: _h,
    date: _d,
    href: _u,
    contestId: _c,
    ...review
  } = blankJournal("2026-10-24");
  const [entry] = await db
    .insert(schema.journalEntries)
    .values({
      userId: "alice",
      title: "=HYPERLINK(unsafe)",
      host: "codeforces.com",
      date: "2026-10-24",
      data: { ...review, lessons: "Private journal lesson" },
    })
    .returning();
  const data = await exportAccount(db, "alice");
  assert.equal(data.journal.length, 1);
  assert.equal((await exportAccount(db, "bob")).journal.length, 0);
  assert.ok(!JSON.stringify(data).includes("providerPayload"));
  assert.ok(journalCsv(data.journal).includes("'=HYPERLINK"));
  await assert.rejects(
    () =>
      deleteJournalEntry(db, "bob", {
        id: entry.id,
        revision: 0,
        confirmation: "DELETE",
      }),
    /not found/,
  );
  await assert.rejects(
    () =>
      deleteJournalEntry(db, "alice", {
        id: entry.id,
        revision: 1,
        confirmation: "DELETE",
      }),
    /changed/,
  );
  await assert.rejects(() =>
    deleteJournalEntry(db, "alice", { id: entry.id, revision: 0 }),
  );
  await deleteJournalEntry(db, "alice", {
    id: entry.id,
    revision: 0,
    confirmation: "DELETE",
  });
  assert.equal(
    (
      await getJournal(
        db,
        "alice",
        journalQuery(new URLSearchParams("page=50")),
      )
    ).page,
    1,
  );
  let health = await inspectHealth(db, now);
  assert.ok(!health.recovery);
  await db
    .insert(schema.workerRuns)
    .values({ startedAt: now, finishedAt: now, success: true });
  assert.ok((await inspectHealth(db, now)).recovery);
  let alerts = 0;
  const sender = async () => {
    alerts++;
  };
  await sendOperationalAlert(db, "coarse health", sender, now);
  await sendOperationalAlert(db, "coarse health", sender, now);
  assert.equal(alerts, 1);
  await sendOperationalAlert(
    db,
    "coarse health",
    sender,
    new Date(now.getTime() + 7 * 3600000),
  );
  assert.equal(alerts, 2);
  const account = {
    uid: "alice",
    authId: randomUUID(),
    email_verified: true,
    signedInAt: now.toISOString(),
  };
  await assert.rejects(
    () =>
      requestDeletion(
        db,
        { ...account, signedInAt: "2026-10-24T00:00:00Z" },
        { confirmation: "DELETE" },
        now,
      ),
    (e) => (e as { status: number }).status === 428,
  );
  await requestDeletion(db, account, { confirmation: "DELETE", receipt }, now);
  await requestDeletion(db, account, { confirmation: "DELETE", receipt }, now);
  assert.equal((await db.select().from(schema.accountDeletions)).length, 1);
  const status = await deletionStatus(db, receipt, now);
  assert.equal(status.status, "pending");
  assert.ok(!JSON.stringify(status).includes("alice"));
  await assert.rejects(() => deletionStatus(db, "b".repeat(64), now));
  let erased = 0,
    identities = 0;
  const provider = {
    erasePhotos: async () => {
      erased++;
      return erased > 1;
    },
    deleteIdentity: async () => {
      identities++;
    },
  };
  assert.equal(
    (await processAccountDeletions(db, provider, later)).processed,
    0,
  );
  assert.equal(erased, 0, "Pending cancellation blocks photo/Auth cleanup");
  await db
    .update(schema.deliveries)
    .set({ status: "cancelled", leaseUntil: new Date(now.getTime() - 1000) })
    .where(eq(schema.deliveries.id, mail.id));
  await processAccountDeletions(db, provider, later);
  assert.equal(erased, 0, "An unresolved lease fails closed");
  await db
    .update(schema.deliveries)
    .set({ leaseUntil: null })
    .where(eq(schema.deliveries.id, mail.id));
  await processAccountDeletions(db, provider, later);
  assert.equal(identities, 0, "Photo cleanup must complete first");
  await processAccountDeletions(db, provider, later);
  assert.equal(identities, 1);
  assert.equal((await deletionStatus(db, receipt, later)).status, "complete");
  assert.equal(
    (await db.select().from(schema.users).where(eq(schema.users.id, "alice")))
      .length,
    0,
  );
  assert.equal((await db.select().from(schema.feedbackMessages)).length, 0);
  const [job] = await db.select().from(schema.accountDeletions);
  assert.equal(job.userId, null);
  assert.equal(job.authId, null);
  await processAccountDeletions(db, provider, later);
  assert.equal(identities, 1);
  await db
    .insert(schema.deliveries)
    .values(
      Array.from({ length: 20 }, () => ({
        userId: "bob",
        contestId: 123,
        reminderType: "1h",
        email: "bob@example.test",
        event: "Budget fixture",
        href: contest.href,
        contestStart: new Date(contest.start),
        dueAt: new Date("2026-10-26T03:00:00Z"),
        status: "cancelled",
        createdAt: now,
      })),
    );
  await assert.rejects(
    () => saveReminder(db, "bob", "bob@example.test", contest, "3h", now),
    (e) => (e as { status: number }).status === 429,
    "Cancelled jobs don't refund creation quota",
  );
  await db.delete(schema.deliveries).where(eq(schema.deliveries.userId, "bob"));
  // Real encryption and a real PostgreSQL restore, including suppression of old mail.
  const backup: Backup = {
    version: 1,
    createdAt: now.toISOString(),
    tables: {
      users: [
        {
          id: "restore-owner",
          email: "private@example.test",
          account_state: "active",
          photo_path: "old/photo.webp",
          avatar_mode: "custom",
        },
      ],
      contests: [{ ...contest, start: contest.start }],
      account_preferences: [
        {
          user_id: "restore-owner",
          default_reminder: "15m",
          reminders_paused: false,
        },
      ],
      reminder_deliveries: [
        {
          id: randomUUID(),
          user_id: "restore-owner",
          contest_id: 123,
          reminder_type: "15m",
          email: "private@example.test",
          event: "Old round",
          href: contest.href,
          contest_start: contest.start,
          due_at: contest.start,
          status: "scheduled",
        },
      ],
    },
  };
  const key = "a1".repeat(32),
    encrypted = encryptBackup(backup, key);
  assert.ok(!encrypted.toString().includes("private@example.test"));
  const decoded = decryptBackup(encrypted, key);
  assert.deepEqual(decoded, backup);
  assert.equal(restoreRows(decoded, ["restore-owner"]).users.length, 0);
  assert.equal(
    restoreRows(decoded, ["restore-owner"]).reminder_deliveries.length,
    0,
  );
  assert.throws(() => decryptBackup(encrypted, "b2".repeat(32)));
  const tampered = JSON.parse(encrypted.toString());
  tampered.data = "AAAA" + tampered.data.slice(4);
  assert.throws(() =>
    decryptBackup(Buffer.from(JSON.stringify(tampered)), key),
  );
  await restoreDatabase(target, decoded, []);
  const [restored] = await target.select().from(schema.deliveries);
  assert.equal(restored.status, "cancelled");
  const quiet = await processReminderQueue({
    db: target,
    provider: {
      schedule: async () => {
        throw new Error("Restore must never send");
      },
      cancel: async () => {
        throw new Error("Restore must never call provider");
      },
    },
  });
  assert.equal(quiet.scheduled, 0);
  assert.equal(quiet.retried, 0);
  assert.equal(quiet.failed, 0);
  assert.equal((await target.select().from(schema.users))[0].photoPath, null);
  assert.ok(
    (await target.select().from(schema.accountPreferences))[0].remindersPaused,
  );
  await assert.rejects(() => restoreDatabase(target, decoded, []), /not empty/);
  // HTTP boundaries remain private; fake auth never contacts Google/Supabase.
  for (const handler of [settingsGET, exportGET, feedbackGET])
    assert.equal(
      (await handler(new Request("https://example.test/api/private"))).status,
      401,
    );
  assert.equal(
    (
      await deletionGET(
        new Request("https://example.test/api/account/deletion", {
          headers: { "X-Deletion-Receipt": "bad" },
        }),
      )
    ).status,
    404,
  );
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  process.env.ADMIN_AUTH_USER_IDS = "owner-admin";
  globalThis.fetch = async () =>
    Response.json({
      id: "bob",
      email: "bob@example.test",
      email_confirmed_at: now.toISOString(),
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: now.toISOString(),
    });
  assert.equal(
    (
      await feedbackGET(
        new Request("https://example.test/api/admin/feedback", {
          headers: { Authorization: "Bearer token" },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await feedbackPATCH(
        new Request("https://example.test/api/admin/feedback", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: feedback.id, status: "resolved" }),
        }),
      )
    ).status,
    403,
  );
  const publicHealth = await healthGET();
  const publicBody = JSON.stringify(await publicHealth.json());
  assert.ok(
    !publicBody.includes("email") &&
      !publicBody.includes("overdue") &&
      !publicBody.includes("bob"),
  );
  const rls = await engine.query<{ relname: string; relrowsecurity: boolean }>(
    "select relname,relrowsecurity from pg_class where relname in ('account_preferences','request_buckets','account_deletions','feedback_messages','operational_alerts')",
  );
  assert.equal(rls.rows.length, 5);
  assert.ok(rls.rows.every((row) => row.relrowsecurity));
  console.log(
    "Launch checks passed: timing, preference conflicts/pause, private exports/CSV, throttling, feedback isolation/admin gate, journal deletion, durable cancellation-first account deletion, coarse health, alert deduplication, authenticated encryption and empty-database restore. No live data, network, emails or Auth deletions.",
  );
} finally {
  globalThis.fetch = originalFetch;
  globals.contestDatabase = previous;
  await engine.close();
  await restoreEngine.close();
}
