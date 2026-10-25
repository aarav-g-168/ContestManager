import { after, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { readAccountJson } from "@/lib/http/request-body";
import { takeRequestLimit } from "@/lib/security/rate-limit";
import {
  deletionStatus,
  requestDeletion,
} from "@/features/account/server/deletion";
import { processReminderQueue } from "@/features/reminders/server/queue";
import { ensureAccount } from "@/features/auth/server/account";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  try {
    const user = await authenticateProfile(request, { allowDeleting: true }),
      db = getDatabase();
    await takeRequestLimit(db, user.uid, "delete", 3, 3600);
    const input = await readAccountJson(request);
    await ensureAccount(user);
    const value = await requestDeletion(db, user, input);
    try {
      after(async () => {
        await processReminderQueue({ limit: 5, userId: user.uid }).catch(() =>
          console.error("Cancellation will retry"),
        );
      });
    } catch {
      /* The durable worker continues the confirmed request. */
    }
    return NextResponse.json(value, { status: 202, headers });
  } catch (e) {
    return profileErrorResponse(e);
  }
}
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      await deletionStatus(
        getDatabase(),
        request.headers.get("X-Deletion-Receipt") ?? "",
      ),
      { headers },
    );
  } catch (e) {
    return profileErrorResponse(e);
  }
}
