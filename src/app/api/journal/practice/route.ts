import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { getDatabase } from "@/lib/db";
import { readLimitedText } from "@/lib/http/request-body";
import { ProfileRequestError } from "@/lib/http/request-error";
import { JournalValidationError } from "@/features/journal/lib/journal";
import { practiceQuery } from "@/features/journal/lib/practice";
import {
  getPractice,
  updatePractice,
} from "@/features/journal/server/practice";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
function failure(error: unknown) {
  if (error instanceof JournalValidationError)
    return NextResponse.json(
      { error: error.fields.problems ?? error.message },
      { status: 400, headers },
    );
  return profileErrorResponse(error);
}
export async function GET(request: Request) {
  try {
    const account = await authenticateProfile(request);
    return NextResponse.json(
      await getPractice(
        getDatabase(),
        account.uid,
        practiceQuery(new URL(request.url).searchParams),
      ),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const account = await authenticateProfile(request);
    let input;
    try {
      input = JSON.parse(await readLimitedText(request, 8192));
    } catch (error) {
      if (error instanceof ProfileRequestError) throw error;
      throw new ProfileRequestError("Invalid practice details.", 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ProfileRequestError("Invalid practice details.", 400);
    return NextResponse.json(
      await updatePractice(getDatabase(), account.uid, input),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
