import { after, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { readAccountJson } from "@/lib/http/request-body";
import { ensureAccount } from "@/features/auth/server/account";
import { getSettings, saveSettings } from "@/features/account/server/settings";
import { processReminderQueue } from "@/features/reminders/server/queue";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request, { allowDeleting: true });
    return NextResponse.json(await getSettings(getDatabase(), user.uid), {
      headers,
    });
  } catch (e) {
    return profileErrorResponse(e);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const input = await readAccountJson(request);
    await ensureAccount(user);
    const value = await saveSettings(getDatabase(), user.uid, input);
    if (value.remindersPaused)
      try {
        after(async () => {
          await processReminderQueue({ limit: 5, userId: user.uid }).catch(() =>
            console.error("Reminder cancellation will retry"),
          );
        });
      } catch {
        /* Cron remains the durable fallback outside a request lifecycle. */
      }
    return NextResponse.json(value, { headers });
  } catch (e) {
    return profileErrorResponse(e);
  }
}
