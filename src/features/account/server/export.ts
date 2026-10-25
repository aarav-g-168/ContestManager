import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import {
  users,
  accountPreferences,
  bookmarks,
  contests,
  deliveries,
  journalEntries,
  weeklyGoals,
  feedbackMessages,
  contestResults,
} from "@/lib/db/schema";
export async function exportAccount(db: Database, uid: string) {
  return db.transaction(async (tx) => {
    // One repeatable snapshot avoids mixing revisions from concurrent edits.
    await tx.execute(
      sql`set transaction isolation level repeatable read, read only`,
    );
    const [
      accounts,
      preferences,
      saved,
      mail,
      journal,
      goals,
      feedback,
      results,
    ] = await Promise.all([
      tx
        .select({
          email: users.email,
          name: users.name,
          profile: users.profile,
          avatarMode: users.avatarMode,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, uid)),
      tx
        .select({
          defaultReminder: accountPreferences.defaultReminder,
          remindersPaused: accountPreferences.remindersPaused,
          onboardingDismissed: accountPreferences.onboardingDismissed,
        })
        .from(accountPreferences)
        .where(eq(accountPreferences.userId, uid)),
      tx
        .select({ contest: contests, createdAt: bookmarks.createdAt })
        .from(bookmarks)
        .innerJoin(contests, eq(bookmarks.contestId, contests.id))
        .where(eq(bookmarks.userId, uid)),
      tx
        .select({
          event: deliveries.event,
          url: deliveries.href,
          contestStart: deliveries.contestStart,
          reminderType: deliveries.reminderType,
          dueAt: deliveries.dueAt,
          status: deliveries.status,
          createdAt: deliveries.createdAt,
        })
        .from(deliveries)
        .where(eq(deliveries.userId, uid)),
      tx
        .select({
          id: journalEntries.id,
          title: journalEntries.title,
          host: journalEntries.host,
          date: journalEntries.date,
          href: journalEntries.href,
          data: journalEntries.data,
          createdAt: journalEntries.createdAt,
          updatedAt: journalEntries.updatedAt,
        })
        .from(journalEntries)
        .where(eq(journalEntries.userId, uid)),
      tx
        .select({
          weekStart: weeklyGoals.weekStart,
          contests: weeklyGoals.contests,
          problems: weeklyGoals.problems,
        })
        .from(weeklyGoals)
        .where(eq(weeklyGoals.userId, uid)),
      tx
        .select({
          category: feedbackMessages.category,
          subject: feedbackMessages.subject,
          message: feedbackMessages.message,
          status: feedbackMessages.status,
          createdAt: feedbackMessages.createdAt,
        })
        .from(feedbackMessages)
        .where(eq(feedbackMessages.userId, uid)),
      tx
        .select({
          contestId: contestResults.contestId,
          rank: contestResults.rank,
          score: contestResults.score,
          source: contestResults.source,
        })
        .from(contestResults)
        .where(eq(contestResults.userId, uid)),
    ]);
    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      account: accounts[0] ?? null,
      preferences: preferences[0] ?? null,
      bookmarks: saved,
      reminderHistory: mail,
      journal,
      weeklyGoals: goals,
      feedback,
      contestResults: results,
    };
  });
}
export function journalCsv(
  rows: Awaited<ReturnType<typeof exportAccount>>["journal"],
) {
  // Quoting alone doesn't stop spreadsheet formulas. Neutralize formula prefixes.
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      [
        "Contest",
        "Platform",
        "Date",
        "Status",
        "Rank",
        "Score",
        "Solved",
        "Went well",
        "Mistakes",
        "Lessons",
        "Topics",
        "Problems (JSON)",
        "Links (JSON)",
        "URL",
      ],
      ...rows.map((row) => [
        row.title,
        row.host,
        row.date,
        row.data.status,
        row.data.rank,
        row.data.score,
        row.data.solved,
        row.data.wentWell,
        row.data.mistakes,
        row.data.lessons,
        row.data.tags.join("; "),
        JSON.stringify(row.data.problems),
        JSON.stringify(row.data.links),
        row.href,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
