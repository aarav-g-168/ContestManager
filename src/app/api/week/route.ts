import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { getDatabase } from "@/lib/db";
import { getWeekPlan } from "@/features/week/server/week";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const account = await authenticateProfile(request);
    return NextResponse.json(await getWeekPlan(getDatabase(), account.uid), {
      headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
    });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
