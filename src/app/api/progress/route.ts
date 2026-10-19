import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { getDatabase } from "@/lib/db";
import { progressQuery } from "@/features/progress/lib/progress";
import { getProgress } from "@/features/progress/server/progress";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const account = await authenticateProfile(request);
    return NextResponse.json(
      await getProgress(
        getDatabase(),
        account.uid,
        progressQuery(new URL(request.url).searchParams),
      ),
      {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Authorization",
        },
      },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
