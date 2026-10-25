import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { feedbackMessages, users } from "@/lib/db/schema";
import { FEEDBACK_CATEGORIES } from "@/features/support/lib/contact";
import { ProfileRequestError } from "@/lib/http/request-error";
import { takeRequestLimit } from "@/lib/security/rate-limit";
export async function submitFeedback(
  db: Database,
  uid: string,
  input: unknown,
) {
  const raw = input as Record<string, unknown> | null;
  if (
    !raw ||
    !FEEDBACK_CATEGORIES.includes(raw.category as never) ||
    typeof raw.subject !== "string" ||
    !raw.subject.trim() ||
    raw.subject.trim().length > 120 ||
    typeof raw.message !== "string" ||
    !raw.message.trim() ||
    raw.message.trim().length > 3000
  )
    throw new ProfileRequestError(
      "Choose a category, a subject (1–120 characters) and a message (1–3,000 characters).",
      400,
    );
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(users)
      .where(eq(users.id, uid))
      .for("update");
    if (!owner || owner.accountState !== "active")
      throw new ProfileRequestError("Your account is unavailable.", 423);
    await takeRequestLimit(
      tx as unknown as Database,
      uid,
      "feedback",
      5,
      86400,
    );
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackMessages)
      .where(eq(feedbackMessages.userId, uid));
    if (count >= 100)
      throw new ProfileRequestError(
        "Your feedback limit is reached. Contact support by email.",
        429,
      );
    return (
      await tx
        .insert(feedbackMessages)
        .values({
          userId: uid,
          category: raw.category as string,
          subject: (raw.subject as string).trim(),
          message: (raw.message as string).trim(),
        })
        .returning()
    )[0];
  });
}
export async function listFeedback(db: Database, uid: string) {
  return db
    .select({
      id: feedbackMessages.id,
      category: feedbackMessages.category,
      subject: feedbackMessages.subject,
      message: feedbackMessages.message,
      status: feedbackMessages.status,
      createdAt: feedbackMessages.createdAt,
    })
    .from(feedbackMessages)
    .where(eq(feedbackMessages.userId, uid))
    .orderBy(desc(feedbackMessages.createdAt))
    .limit(20);
}
export async function adminFeedback(db: Database, status = "open") {
  return db
    .select({
      id: feedbackMessages.id,
      category: feedbackMessages.category,
      subject: feedbackMessages.subject,
      message: feedbackMessages.message,
      status: feedbackMessages.status,
      createdAt: feedbackMessages.createdAt,
      email: users.email,
    })
    .from(feedbackMessages)
    .innerJoin(users, eq(feedbackMessages.userId, users.id))
    .where(
      eq(feedbackMessages.status, status === "resolved" ? "resolved" : "open"),
    )
    .orderBy(desc(feedbackMessages.createdAt))
    .limit(50);
}
export async function resolveFeedback(db: Database, input: unknown) {
  const raw = input as Record<string, unknown> | null;
  if (
    !raw ||
    typeof raw.id !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(raw.id) ||
    !["open", "resolved"].includes(raw.status as string)
  )
    throw new ProfileRequestError("Invalid feedback update.", 400);
  const [row] = await db
    .update(feedbackMessages)
    .set({ status: raw.status as string })
    .where(and(eq(feedbackMessages.id, raw.id)))
    .returning({ id: feedbackMessages.id, status: feedbackMessages.status });
  if (!row) throw new ProfileRequestError("Feedback not found.", 404);
  return row;
}
