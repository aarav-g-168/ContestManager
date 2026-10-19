// Runs a real PostgreSQL engine in memory. No live database, Firebase, or email.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import type { Database } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import {
  saveReminder,
  cancelReminder,
} from "../../src/features/reminders/server/service";
import {
  processReminderQueue,
  recordMailEvent,
} from "../../src/features/reminders/server/queue";
import {
  MailError,
  escapeHtml,
  resendProvider,
  type Delivery,
  type MailProvider,
} from "../../src/features/reminders/server/email";
import {
  normalizeProfile,
  validateProfile,
} from "../../src/features/profile/lib/profile";
import {
  resolveAccountIdentity,
  verifyAccountToken,
} from "../../src/features/auth/server/auth";
import type { User } from "@supabase/supabase-js";

process.env.RESEND_FROM = "Contest Manager <reminders@example.test>";
const engine = new PGlite();
// Drizzle query/transaction APIs are shared; only the test driver differs.
const db = drizzle(engine, { schema }) as unknown as Database;
const now = new Date("2026-10-20T08:00:00Z");
const contest = {
  id: 123,
  event: 'Round <script>alert("x")</script>',
  host: "codeforces.com",
  href: "https://codeforces.com/contest/123",
  start: "2026-10-21T08:00:00Z",
  duration: 7200,
};
let requests = 0;
let cancels = 0;
const accepted = new Map<string, string>();
const payloads: unknown[] = [];
let interruptOnce = false;
let rejectOnce = false;
let cancelFailsOnce = false;
const provider: MailProvider = {
  async schedule(row: Delivery) {
    requests++;
    payloads.push(row.providerPayload);
    if (rejectOnce) {
      rejectOnce = false;
      throw new MailError("resend:403:validation_error", false);
    }
    const id = accepted.get(row.id) ?? `mail-${row.id}`;
    accepted.set(row.id, id);
    if (interruptOnce) {
      interruptOnce = false;
      throw new Error("Response lost after provider accepted");
    }
    return id;
  },
  async cancel() {
    cancels++;
    if (cancelFailsOnce) {
      cancelFailsOnce = false;
      throw new Error("Timeout");
    }
    return "cancelled";
  },
};
const row = async (id: string) =>
  (
    await db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.id, id))
  )[0];
const run = (ids?: string[], at = now) =>
  processReminderQueue({ db, provider, now: at, ids, limit: 12 });
try {
  for (const file of (await readdir("drizzle"))
    .filter((file) => file.endsWith(".sql"))
    .sort())
    await engine.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(schema.users).values([
    { id: "alice", email: "alice@example.test" },
    { id: "bob", email: "bob@example.test" },
  ]);
  await db
    .insert(schema.accountIdentities)
    .values({ provider: "google", subject: "google-alice", userId: "alice" });
  const verifiedUser = {
    id: "supabase-alice",
    email: "alice@example.test",
    email_confirmed_at: "2026-10-01",
    user_metadata: { full_name: "Alice" },
    identities: [
      { provider: "google", identity_data: { sub: "google-alice" } },
    ],
  } as unknown as User;
  assert.equal((await resolveAccountIdentity(verifiedUser, db)).uid, "alice");
  assert.equal(
    (await resolveAccountIdentity({ ...verifiedUser, identities: [] }, db)).uid,
    "supabase-alice",
    "Email alone cannot recover a legacy account",
  );
  assert.equal(
    (
      await resolveAccountIdentity(
        {
          ...verifiedUser,
          identities: [],
          user_metadata: { sub: "google-alice" },
        },
        db,
      )
    ).uid,
    "supabase-alice",
    "Editable metadata cannot claim a legacy identity",
  );
  assert.equal(
    (
      await resolveAccountIdentity(
        { ...verifiedUser, email_confirmed_at: undefined },
        db,
      )
    ).email_verified,
    false,
  );
  const realFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  let authStatus = 200;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://auth-test.supabase.co/auth/v1/user");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer test-token",
    );
    return Response.json(
      authStatus === 200
        ? verifiedUser
        : { message: "Rejected", code: "bad_jwt" },
      { status: authStatus },
    );
  };
  try {
    assert.equal((await verifyAccountToken("test-token", db)).uid, "alice");
    authStatus = 401;
    await assert.rejects(
      () => verifyAccountToken("test-token", db),
      (error: unknown) => (error as { status: number }).status === 401,
    );
    authStatus = 503;
    await assert.rejects(
      () => verifyAccountToken("test-token", db),
      (error: unknown) => (error as { status: number }).status === 503,
    );
  } finally {
    globalThis.fetch = realFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
  await engine.exec(
    "create role browser_test; grant usage on schema public to browser_test; grant select, insert, update, delete on all tables in schema public to browser_test; set role browser_test;",
  );
  try {
    assert.equal(
      (await engine.query("select * from users")).rows.length,
      0,
      "RLS blocks direct browser table access",
    );
    await assert.rejects(() =>
      engine.exec("insert into users (id) values ('unauthorized')"),
    );
  } finally {
    await engine.exec("reset role");
  }
  await db
    .insert(schema.contests)
    .values({ ...contest, start: new Date(contest.start) });
  // Ownership and uniqueness: one user's delete must not touch another's bookmark.
  await db.insert(schema.bookmarks).values([
    { userId: "alice", contestId: 123 },
    { userId: "bob", contestId: 123 },
  ]);
  await db
    .delete(schema.bookmarks)
    .where(
      and(
        eq(schema.bookmarks.userId, "alice"),
        eq(schema.bookmarks.contestId, 123),
      ),
    );
  assert.equal((await db.select().from(schema.bookmarks))[0].userId, "bob");
  await assert.rejects(() =>
    db
      .insert(schema.bookmarks)
      .values({ userId: "missing-user", contestId: 123 }),
  );
  assert.equal(
    validateProfile(
      normalizeProfile({
        displayName: "Alice",
        website: "javascript:alert(1)",
      }),
    ).website !== undefined,
    true,
  );
  // Optimistic profile revision: only one concurrent editor wins.
  const saveProfile = () =>
    db
      .update(schema.users)
      .set({ profileRevision: 1 })
      .where(
        and(eq(schema.users.id, "alice"), eq(schema.users.profileRevision, 0)),
      )
      .returning();
  const edits = await Promise.all([saveProfile(), saveProfile()]);
  assert.deepEqual(edits.map((result) => result.length).sort(), [0, 1]);
  await assert.rejects(() =>
    saveReminder(db, "alice", "alice@example.test", contest, "24h", now),
  );
  await assert.rejects(() =>
    saveReminder(db, "alice", "alice@example.test", contest, "invalid", now),
  );
  const first = await saveReminder(
    db,
    "alice",
    "alice@example.test",
    contest,
    "6h",
    now,
  );
  const again = await saveReminder(
    db,
    "alice",
    "alice@example.test",
    contest,
    "6h",
    now,
  );
  assert.equal(first.id, again.id, "Repeated save is idempotent");
  await run([first.id]);
  assert.equal((await row(first.id)).status, "scheduled");
  assert.equal(
    (await row(first.id)).requestScheduledAt?.toISOString(),
    "2026-10-21T02:00:00.000Z",
  );
  assert.equal(requests, 1);
  await Promise.all([run([first.id]), run([first.id])]);
  assert.equal(
    requests,
    1,
    "Scheduled reminders are never resent by periodic workers",
  );
  const replaced = await saveReminder(
    db,
    "alice",
    "alice@example.test",
    contest,
    "1h",
    now,
  );
  await run([first.id, replaced.id]);
  assert.equal((await row(first.id)).status, "cancelled");
  assert.equal((await row(replaced.id)).status, "scheduled");
  assert.equal(cancels, 1);
  await recordMailEvent(db, {
    id: "event-delivered",
    providerId: (await row(replaced.id)).providerId!,
    type: "email.delivered",
  });
  await recordMailEvent(db, {
    id: "event-sent-late",
    providerId: (await row(replaced.id)).providerId!,
    type: "email.sent",
  });
  await recordMailEvent(db, {
    id: "event-delivered",
    providerId: (await row(replaced.id)).providerId!,
    type: "email.delivered",
  });
  assert.equal(
    (await row(replaced.id)).status,
    "delivered",
    "Duplicate/out-of-order webhooks never downgrade delivery status",
  );
  assert.equal((await db.select().from(schema.mailEvents)).length, 2);
  // A lost HTTP response is retried with the same immutable request/key.
  const lost = await saveReminder(
    db,
    "bob",
    "bob@example.test",
    contest,
    "6h",
    now,
  );
  interruptOnce = true;
  await run([lost.id]);
  assert.equal((await row(lost.id)).status, "pending");
  const initialPayload = payloads.at(-1);
  await run([lost.id], new Date(now.getTime() + 60000));
  assert.deepEqual(payloads.at(-1), initialPayload);
  assert.equal(
    accepted.size,
    3,
    "Lost response does not create a second provider email",
  );
  assert.equal((await row(lost.id)).status, "scheduled");
  // Cancelling a scheduled message retries failed provider cancellations.
  await cancelReminder(db, "bob", 123);
  cancelFailsOnce = true;
  await run([lost.id], new Date());
  assert.equal((await row(lost.id)).cancelRequested, true);
  await run([lost.id], new Date(Date.now() + 1000000));
  assert.equal((await row(lost.id)).status, "cancelled");
  // Cancellation before any dispatch does not send an email just to cancel it.
  const unsent = await saveReminder(
    db,
    "bob",
    "bob@example.test",
    contest,
    "1h",
    now,
  );
  await cancelReminder(db, "bob", 123);
  const before = requests;
  await run([unsent.id], new Date());
  assert.equal((await row(unsent.id)).status, "cancelled");
  assert.equal(requests, before);
  const failed = await saveReminder(
    db,
    "bob",
    "bob@example.test",
    contest,
    "1h",
    now,
  );
  rejectOnce = true;
  await run([failed.id]);
  assert.equal((await row(failed.id)).status, "failed");
  assert.equal(
    (
      await db
        .select()
        .from(schema.reminders)
        .where(eq(schema.reminders.userId, "bob"))
    ).length,
    1,
    "Rejected emails remain visible rather than being deleted",
  );
  // A late recovery sends before contest start; an expired contest never sends.
  const late = await saveReminder(
    db,
    "bob",
    "bob@example.test",
    contest,
    "6h",
    now,
  );
  await run([failed.id, late.id], new Date("2026-10-21T03:00:00Z"));
  assert.equal((await row(late.id)).requestScheduledAt, null);
  assert.equal((await row(late.id)).status, "scheduled");
  const expired = await saveReminder(
    db,
    "bob",
    "bob@example.test",
    contest,
    "1h",
    now,
  );
  const calls = requests;
  await run([late.id, expired.id], new Date("2026-10-22T08:00:00Z"));
  assert.equal((await row(expired.id)).status, "expired");
  assert.equal(requests, calls);
  // Concurrent pending claims and cancellation while an HTTP request is in flight.
  await db
    .insert(schema.users)
    .values({ id: "carol", email: "carol@example.test" });
  const raced = await saveReminder(
    db,
    "carol",
    "carol@example.test",
    contest,
    "6h",
    now,
  );
  let releaseSend!: () => void;
  let entered!: () => void;
  const sending = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    releaseSend = resolve;
  });
  const heldProvider: MailProvider = {
    ...provider,
    async schedule(delivery) {
      const id = await provider.schedule(delivery);
      entered();
      await held;
      return id;
    },
  };
  const firstWorker = processReminderQueue({
    db,
    provider: heldProvider,
    now,
    ids: [raced.id],
  });
  await sending;
  const concurrent = await run([raced.id]);
  assert.equal(
    concurrent.scheduled,
    0,
    "A second worker cannot claim a leased delivery",
  );
  await cancelReminder(db, "carol", 123);
  releaseSend();
  await firstWorker;
  assert.equal(
    (await row(raced.id)).status,
    "cancelled",
    "In-flight acceptance is followed by requested cancellation",
  );
  const ambiguous = await saveReminder(
    db,
    "carol",
    "carol@example.test",
    contest,
    "1h",
    now,
  );
  interruptOnce = true;
  await run([ambiguous.id]);
  const callsBeforeExpiry = requests;
  await run([ambiguous.id], new Date(now.getTime() + 23 * 3600000 + 60000));
  assert.equal((await row(ambiguous.id)).status, "uncertain");
  assert.equal(
    requests,
    callsBeforeExpiry,
    "Ambiguous sends are not retried beyond the provider idempotency window",
  );
  assert.equal(escapeHtml('<img src="x">'), "&lt;img src=&quot;x&quot;&gt;");
  // Exercise the real REST adapter without making any network requests.
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-key-never-transmitted";
  try {
    const delivery = await row(first.id);
    let capturedKey: string | null = null;
    globalThis.fetch = async (_input, options) => {
      capturedKey = new Headers(options?.headers).get("Idempotency-Key");
      const payload = JSON.parse(String(options?.body));
      assert.equal(payload.scheduled_at, "2026-10-21T02:00:00.000Z");
      assert.ok(!payload.html.includes("<script>"));
      return Response.json({ id: "provider-test-id" });
    };
    assert.equal(await resendProvider.schedule(delivery), "provider-test-id");
    assert.equal(capturedKey, `reminder/${delivery.id}`);
    globalThis.fetch = async () =>
      Response.json({ name: "validation_error" }, { status: 403 });
    await assert.rejects(
      () => resendProvider.schedule(delivery),
      (error: unknown) => error instanceof MailError && !error.retryable,
    );
    globalThis.fetch = async () =>
      Response.json({ name: "rate_limit_exceeded" }, { status: 429 });
    await assert.rejects(
      () => resendProvider.schedule(delivery),
      (error: unknown) => error instanceof MailError && error.retryable,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log(
    "Backend checks passed: relational constraints, ownership, profile revisions, reminder validation, scheduling, idempotency, replacement, cancellation/retry, webhook ordering, rejected sends, late recovery, and expiry. No emails sent.",
  );
} finally {
  await engine.close();
}
