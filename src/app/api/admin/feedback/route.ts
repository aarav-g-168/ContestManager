import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { requireAdmin } from "@/features/admin/server/access";
import { getDatabase } from "@/lib/db";
import { readAccountJson } from "@/lib/http/request-body";
import {
  adminFeedback,
  resolveFeedback,
} from "@/features/support/server/feedback";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: Request) {
  try {
    requireAdmin(await authenticateProfile(request));
    return NextResponse.json(
      await adminFeedback(
        getDatabase(),
        new URL(request.url).searchParams.get("status") ?? "open",
      ),
      { headers },
    );
  } catch (e) {
    return profileErrorResponse(e);
  }
}
export async function PATCH(request: Request) {
  try {
    requireAdmin(await authenticateProfile(request));
    return NextResponse.json(
      await resolveFeedback(getDatabase(), await readAccountJson(request)),
      { headers },
    );
  } catch (e) {
    return profileErrorResponse(e);
  }
}
