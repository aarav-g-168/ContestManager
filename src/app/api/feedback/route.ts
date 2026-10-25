import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { getDatabase } from "@/lib/db";
import { ensureAccount } from "@/features/auth/server/account";
import { readAccountJson } from "@/lib/http/request-body";
import {
  listFeedback,
  submitFeedback,
} from "@/features/support/server/feedback";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request);
    return NextResponse.json(await listFeedback(getDatabase(), user.uid), {
      headers,
    });
  } catch (e) {
    return profileErrorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const input = await readAccountJson(request);
    await ensureAccount(user);
    const row = await submitFeedback(getDatabase(), user.uid, input);
    return NextResponse.json(
      { id: row.id, status: row.status },
      { status: 201, headers },
    );
  } catch (e) {
    return profileErrorResponse(e);
  }
}
