import { ensureAccount } from "@/features/auth/server/account";
import { readProfilePhoto } from "@/features/profile/server/photos";
import {
  authenticateProfile,
  profileErrorResponse,
  ProfileRequestError,
} from "@/lib/http/account-request";
import { ownedAvatarPath } from "@/features/profile/server/profile";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const account = await ensureAccount(user);
    const path = account.photoPath;
    if (account.avatarMode !== "custom" || !ownedAvatarPath(path, user.uid))
      throw new ProfileRequestError("No uploaded profile photo.", 404);
    const image = await readProfilePhoto(path, user.uid, "storage");
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
