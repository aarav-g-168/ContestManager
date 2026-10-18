import { NextResponse } from "next/server";
import { authenticateProfile, profileErrorResponse } from "@/lib/profileServer";
import { getDatabase } from "@/lib/db";
import { progressQuery } from "@/lib/progress";
import { getProgress } from "@/lib/progressServer";
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
