import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendContestReminderEmail } from "@/lib/email";

export async function GET() {
  try {
    const userDocs = await adminDb
      .collection("users")
      .listDocuments();

    let emailsSent = 0;

    for (const userDoc of userDocs) {
      const remindersSnapshot = await userDoc
        .collection("reminders")
        .get();

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminder = reminderDoc.data();

        if (reminder.sent) continue;

        const contestStart = new Date(reminder.start);
        const now = new Date();

        const hoursUntilContest =
          (contestStart.getTime() - now.getTime()) /
          (1000 * 60 * 60);

        let shouldSend = false;

        if (
          reminder.reminderType === "1h" &&
          hoursUntilContest <= 1 &&
          hoursUntilContest > 0
        ) {
          shouldSend = true;
        }

        if (
          reminder.reminderType === "6h" &&
          hoursUntilContest <= 6 &&
          hoursUntilContest > 0
        ) {
          shouldSend = true;
        }

        if (
          reminder.reminderType === "24h" &&
          hoursUntilContest <= 24 &&
          hoursUntilContest > 0
        ) {
          shouldSend = true;
        }

        if (!shouldSend) continue;

        await sendContestReminderEmail(
          reminder.email,
          reminder.event,
          reminder.href,
          reminder.reminderType
        );

        await reminderDoc.ref.update({
          sent: true,
          sentAt: new Date(),
        });

        emailsSent++;
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}