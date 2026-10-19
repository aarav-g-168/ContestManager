import { NextResponse } from "next/server";
import {
  authenticateProfile,
  profileErrorResponse,
} from "@/lib/http/account-request";
import { requireAdmin } from "@/features/admin/server/access";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    requireAdmin(await authenticateProfile(request));
    return NextResponse.json(
      { admin: true },
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
