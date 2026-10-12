import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { bookmarks } from "@/lib/db/schema";
import { ensureAccount, verifiedContest } from "@/lib/accountServer";
import {
  authenticateProfile,
  profileErrorResponse,
  ProfileRequestError,
} from "@/lib/profileServer";
import { readAccountJson } from "@/lib/requestBody";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const rows = await getDatabase()
      .select({ contestId: bookmarks.contestId })
      .from(bookmarks)
      .where(eq(bookmarks.userId, user.uid));
    return NextResponse.json(
      { ids: rows.map((row) => row.contestId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const input = await readAccountJson(request);
    await ensureAccount(user);
    const contest = await verifiedContest(input.contestId);
    await getDatabase()
      .insert(bookmarks)
      .values({ userId: user.uid, contestId: contest.id })
      .onConflictDoNothing();
    return NextResponse.json({ success: true });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const id = Number(new URL(request.url).searchParams.get("contestId"));
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new ProfileRequestError("Choose a valid contest.", 400);
    await getDatabase()
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, user.uid), eq(bookmarks.contestId, id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
