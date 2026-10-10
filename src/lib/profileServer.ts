import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { adminAuth } from "./firebaseAdmin";
import { normalizeProfile, type SavedProfile } from "./profile";

export class ProfileRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function authenticateProfile(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    throw new ProfileRequestError("Sign in to manage your profile.", 401);
  try {
    return await adminAuth.verifyIdToken(token, true);
  } catch {
    throw new ProfileRequestError(
      "Your session expired. Sign in again to continue.",
      401,
    );
  }
}
export function readSavedProfile(
  data: Record<string, unknown> | undefined,
  token: DecodedIdToken,
): SavedProfile {
  const stored = data?.profile as Record<string, unknown> | undefined;
  return {
    values: normalizeProfile(
      stored,
      typeof token.name === "string" ? token.name : "",
    ),
    avatarMode:
      stored?.avatarMode === "custom" || stored?.avatarMode === "none"
        ? stored.avatarMode
        : "google",
    revision:
      typeof data?.profileRevision === "number" ? data.profileRevision : 0,
    updatedAt:
      typeof data?.profileUpdatedAt === "string" ? data.profileUpdatedAt : null,
  };
}
export function ownedAvatarPath(path: unknown, uid: string): path is string {
  return (
    typeof path === "string" &&
    path.startsWith(`profile-photos/${uid}/`) &&
    /^[\da-f-]+\.webp$/.test(path.split("/").at(-1) ?? "") &&
    path.split("/").length === 3
  );
}
export function profileErrorResponse(error: unknown) {
  if (error instanceof ProfileRequestError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "Profile service failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "We couldn’t save or load your profile. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
