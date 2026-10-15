import {
  bigint,
  boolean,
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
import type { ProfileValues } from "../profile";
import type { JournalReview } from "../journal";

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
export const workerRuns = pgTable("reminder_worker_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: time("started_at").notNull().defaultNow(),
  finishedAt: time("finished_at"),
  success: boolean("success"),
  scheduled: integer("scheduled").notNull().default(0),
  cancelled: integer("cancelled").notNull().default(0),
  retried: integer("retried").notNull().default(0),
  failed: integer("failed").notNull().default(0),
}, (t) => [index("worker_runs_started_idx").on(t.startedAt)]).enableRLS();
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
export const accountIdentities = pgTable("account_identities", {
  provider: text("provider").notNull(),
  subject: text("subject").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.provider, t.subject] })]).enableRLS();

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contestId: bigint("contest_id", { mode: "number" }).references(() => contests.id),
  title: text("title").notNull(), host: text("host").notNull(), date: text("contest_date").notNull(), href: text("href").notNull().default(""),
  data: jsonb("data").$type<JournalReview>().notNull(),
  revision: integer("revision").notNull().default(0),
  createdAt: time("created_at").notNull().defaultNow(),
  updatedAt: time("updated_at").notNull().defaultNow(),
}, (t) => [index("journal_owner_date_idx").on(t.userId, t.date), uniqueIndex("journal_owner_contest_idx").on(t.userId, t.contestId)]).enableRLS();
