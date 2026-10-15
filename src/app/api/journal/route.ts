import { NextResponse } from "next/server";
import { authenticateProfile, profileErrorResponse } from "@/lib/profileServer";
import { getDatabase } from "@/lib/db";
import { ensureAccount } from "@/lib/accountServer";
import { readLimitedText } from "@/lib/requestBody";
import { ProfileRequestError } from "@/lib/requestError";
import { JournalValidationError, journalQuery } from "@/lib/journal";
import {
  createJournalEntry,
  getJournal,
  updateJournalEntry,
} from "@/lib/journalServer";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
function failure(error: unknown) {
  if (error instanceof JournalValidationError)
    return NextResponse.json(
      { error: error.message, fields: error.fields },
      { status: 400, headers },
    );
  return profileErrorResponse(error);
}
async function body(request: Request) {
  try {
    const value = JSON.parse(await readLimitedText(request, 65536));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ProfileRequestError) throw error;
    throw new ProfileRequestError(
      "The journal entry contains invalid data.",
      400,
    );
  }
}
export async function GET(request: Request) {
  try {
    const account = await authenticateProfile(request);
    return NextResponse.json(
      await getJournal(
        getDatabase(),
        account.uid,
        journalQuery(new URL(request.url).searchParams),
      ),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const account = await authenticateProfile(request);
    const input = await body(request);
    await ensureAccount(account);
    return NextResponse.json(
      await createJournalEntry(getDatabase(), account.uid, input.values),
      { status: 201, headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const account = await authenticateProfile(request);
    return NextResponse.json(
      await updateJournalEntry(getDatabase(), account.uid, await body(request)),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
