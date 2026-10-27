import type { DiscoveryPreferences } from "@/features/contests/lib/discovery";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ProfileValues } from "@/features/profile/lib/profile";
import type { JournalReview } from "@/features/journal/lib/journal";

const time = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Stable account ID; imported accounts retain their legacy ID.
  email: text("email"),
  name: text("name"),
  googlePhotoUrl: text("google_photo_url"),
  profile: jsonb("profile").$type<ProfileValues>(),
  avatarMode: text("avatar_mode").notNull().default("google"),
  photoPath: text("photo_path"),
  profileRevision: integer("profile_revision").notNull().default(0),
  profileUpdatedAt: time("profile_updated_at"),
  createdAt: time("created_at").notNull().defaultNow(),
  accountState: text("account_state").notNull().default("active"),
}).enableRLS();
export const contests = pgTable(
  "contests",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    event: text("event").notNull(),
    host: text("host").notNull(),
    href: text("href").notNull(),
    start: time("start").notNull(),
    duration: integer("duration").notNull(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("contests_start_idx").on(t.start),
    index("contests_host_idx").on(t.host),
  ],
).enableRLS();
export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contestId: bigint("contest_id", { mode: "number" })
      .notNull()
      .references(() => contests.id),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.contestId] })],
).enableRLS();
// Immutable delivery snapshots form the durable email outbox. Removing a reminder
// requests cancellation here; history is retained rather than silently deleted.
export const deliveries = pgTable(
  "reminder_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contestId: bigint("contest_id", { mode: "number" })
      .notNull()
      .references(() => contests.id),
    reminderType: text("reminder_type").notNull(),
    email: text("email").notNull(),
    event: text("event").notNull(),
    href: text("href").notNull(),
    contestStart: time("contest_start").notNull(),
    dueAt: time("due_at").notNull(),
    status: text("status").notNull().default("pending"),
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    replacesDeliveryId: uuid("replaces_delivery_id"),
    providerId: text("provider_id"),
    // Fixed on the first claim so retries use the identical provider request.
    requestScheduledAt: time("request_scheduled_at"),
    firstAttemptAt: time("first_attempt_at"),
    providerPayload: jsonb("provider_payload").$type<Record<string, unknown>>(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: time("next_attempt_at").notNull().defaultNow(),
    leaseToken: uuid("lease_token"),
    leaseUntil: time("lease_until"),
    lastError: text("last_error"),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("deliveries_work_idx").on(t.status, t.nextAttemptAt),
    uniqueIndex("deliveries_provider_idx").on(t.providerId),
  ],
).enableRLS();
export const reminders = pgTable(
  "reminders",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contestId: bigint("contest_id", { mode: "number" })
      .notNull()
      .references(() => contests.id),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.contestId] })],
).enableRLS();
export const mailEvents = pgTable(
  "mail_events",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id").notNull(),
    type: text("type").notNull(),
    occurredAt: time("occurred_at"), // Provider event time; null for legacy events.
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("mail_events_provider_idx").on(t.providerId)],
).enableRLS();
export const workerRuns = pgTable(
  "reminder_worker_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startedAt: time("started_at").notNull().defaultNow(),
    finishedAt: time("finished_at"),
    success: boolean("success"),
    scheduled: integer("scheduled").notNull().default(0),
    cancelled: integer("cancelled").notNull().default(0),
    retried: integer("retried").notNull().default(0),
    failed: integer("failed").notNull().default(0),
  },
  (t) => [index("worker_runs_started_idx").on(t.startedAt)],
).enableRLS();
// Relational foundations for future features; no speculative product flows.
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  createdAt: time("created_at").notNull().defaultNow(),
}).enableRLS();
export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })],
).enableRLS();
export const contestResults = pgTable(
  "contest_results",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contestId: bigint("contest_id", { mode: "number" })
      .notNull()
      .references(() => contests.id),
    rank: integer("rank"),
    score: text("score"),
    source: text("source").notNull(),
    recordedAt: time("recorded_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.contestId] }),
    index("results_contest_rank_idx").on(t.contestId, t.rank),
  ],
).enableRLS();

// Trusted external subject -> account mapping preserves existing users across Auth migration.
export const accountIdentities = pgTable(
  "account_identities",
  {
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.provider, t.subject] })],
).enableRLS();

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contestId: bigint("contest_id", { mode: "number" }).references(
      () => contests.id,
    ),
    title: text("title").notNull(),
    host: text("host").notNull(),
    date: text("contest_date").notNull(),
    href: text("href").notNull().default(""),
    data: jsonb("data").$type<JournalReview>().notNull(),
    revision: integer("revision").notNull().default(0),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("journal_owner_date_idx").on(t.userId, t.date),
    uniqueIndex("journal_owner_contest_idx").on(t.userId, t.contestId),
  ],
).enableRLS();

export const weeklyGoals = pgTable(
  "weekly_goals",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    contests: integer("contests").notNull().default(0),
    problems: integer("problems").notNull().default(0),
    revision: integer("revision").notNull().default(0),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.weekStart] }),
    check("weekly_goals_contests_check", sql`${t.contests} between 0 and 21`),
    check("weekly_goals_problems_check", sql`${t.problems} between 0 and 500`),
    check(
      "weekly_goals_monday_check",
      sql`extract(isodow from ${t.weekStart}) = 1`,
    ),
  ],
).enableRLS();

export const accountPreferences = pgTable(
  "account_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    discovery: jsonb("discovery").$type<DiscoveryPreferences>(),
    defaultReminder: text("default_reminder").notNull().default("15m"),
    remindersPaused: boolean("reminders_paused").notNull().default(false),
    onboardingDismissed: boolean("onboarding_dismissed")
      .notNull()
      .default(false),
    revision: integer("revision").notNull().default(0),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "preferences_reminder_check",
      sql`${t.defaultReminder} in ('15m','1h','3h')`,
    ),
  ],
).enableRLS();

export const requestBuckets = pgTable("request_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: time("expires_at").notNull(),
}).enableRLS();

export const accountDeletions = pgTable(
  "account_deletions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    authId: text("auth_id"),
    receiptHash: text("receipt_hash").notNull().unique(),
    status: text("status").notNull().default("pending"),
    leaseToken: uuid("lease_token"),
    leaseUntil: time("lease_until"),
    lastError: text("last_error"),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [
    index("deletion_work_idx").on(t.status, t.updatedAt),
    uniqueIndex("deletion_owner_idx").on(t.userId),
  ],
).enableRLS();

export const feedbackMessages = pgTable(
  "feedback_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: time("created_at").notNull().defaultNow(),
  },
  (t) => [index("feedback_owner_idx").on(t.userId, t.createdAt)],
).enableRLS();

export const operationalAlerts = pgTable("operational_alerts", {
  key: text("key").primaryKey(),
  lastAttemptAt: time("last_attempt_at").notNull(),
  lastSuccessAt: time("last_success_at"),
}).enableRLS();
