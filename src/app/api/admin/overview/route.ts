import { NextResponse } from "next/server";
import { authenticateProfile, profileErrorResponse } from "@/lib/profileServer";
import { requireAdmin } from "@/lib/adminAccess";
import { getDatabase } from "@/lib/db";
import { adminQuery, getAdminOverview } from "@/lib/adminData";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    requireAdmin(await authenticateProfile(request));
    const data = await getAdminOverview(getDatabase(), adminQuery(new URL(request.url).searchParams));
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
  } catch (error) { return profileErrorResponse(error); }
}
