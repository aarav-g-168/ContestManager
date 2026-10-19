import type { VerifiedAccount } from "@/features/auth/server/auth";
import {
  normalizeProfile,
  type SavedProfile,
} from "@/features/profile/lib/profile";
export function readSavedProfile(
  data: Record<string, unknown> | undefined,
  token: VerifiedAccount,
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
