import { NextResponse } from "next/server";
import { authenticateProfile, profileErrorResponse } from "@/lib/profileServer";
import { getDatabase } from "@/lib/db";
import { getWeekPlan } from "@/lib/weekServer";
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
