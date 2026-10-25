import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { ProfileRequestError } from "@/lib/http/request-error";
import { readLimitedText } from "@/lib/http/request-body";
import { getDatabase } from "@/lib/db";
import { ensureAccount } from "@/features/auth/server/account";
import { getWeeklyGoals, saveWeeklyGoals } from "@/features/goals/server/goals";
import { validateGoals } from "@/features/goals/lib/goals";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: Request) {
  try {
    const account = await authenticateProfile(request);
    return NextResponse.json(await getWeeklyGoals(getDatabase(), account.uid), {
      headers,
    });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const account = await authenticateProfile(request);
    let input;
    try {
      input = JSON.parse(await readLimitedText(request, 2048));
    } catch (error) {
      if (error instanceof ProfileRequestError) throw error;
      throw new ProfileRequestError("Enter valid weekly goals.", 400);
    }
    // Validation happens before account writes as well as in the service.
    validateGoals(input);
    await ensureAccount(account);
    return NextResponse.json(
      await saveWeeklyGoals(getDatabase(), account.uid, input),
      { headers },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
