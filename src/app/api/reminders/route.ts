import { eq } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { deliveries, reminders } from "@/lib/db/schema";
import { ensureAccount, verifiedContest } from "@/lib/accountServer";
import {
  authenticateProfile,
  profileErrorResponse,
  ProfileRequestError,
} from "@/lib/profileServer";
import { assertMailConfigured } from "@/lib/email";
import { processReminderQueue } from "@/lib/reminderQueue";
import { cancelReminder, saveReminder } from "@/lib/reminderService";
import { readAccountJson } from "@/lib/requestBody";
export const runtime = "nodejs";
export const maxDuration = 60;
function dispatch(ids: string[]) {
  after(async () => {
    try {
      await processReminderQueue({ ids, limit: 5 });
    } catch {
      console.error("Reminder outbox processing failed; scheduler will retry");
    }
  });
}
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const rows = await getDatabase()
      .select({
        contestId: reminders.contestId,
        reminderType: deliveries.reminderType,
        status: deliveries.status,
      })
      .from(reminders)
      .innerJoin(deliveries, eq(reminders.deliveryId, deliveries.id))
      .where(eq(reminders.userId, user.uid));
    return NextResponse.json(
      { reminders: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await authenticateProfile(request);
    if (!user.email || !user.email_verified)
      throw new ProfileRequestError(
        "Verify your account email to receive reminders.",
        400,
      );
    try {
      assertMailConfigured();
    } catch {
      throw new ProfileRequestError(
        "Email reminders are not configured yet. Please try again later.",
        503,
      );
    }
    const input = await readAccountJson(request);
    if (typeof input.reminderType !== "string")
      throw new ProfileRequestError("Choose a valid reminder time.", 400);
    const contest = await verifiedContest(input.contestId);
    await ensureAccount(user);
    const job = await saveReminder(
      getDatabase(),
      user.uid,
      user.email,
      contest,
      input.reminderType,
    );
    dispatch([job.id, ...(job.previous ? [job.previous] : [])]);
    return NextResponse.json(
      { success: true, status: "pending" },
      { status: 202 },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const id = Number(new URL(request.url).searchParams.get("contestId"));
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new ProfileRequestError("Choose a valid contest.", 400);
    const job = await cancelReminder(getDatabase(), user.uid, id);
    if (job) dispatch([job]);
    return NextResponse.json(
      { success: true, status: "cancellation_requested" },
      { status: 202 },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
