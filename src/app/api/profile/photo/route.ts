import { adminDb } from "@/lib/firebaseAdmin";
import { readProfilePhoto } from "@/lib/profilePhotos";
import {
  authenticateProfile,
  ownedAvatarPath,
  profileErrorResponse,
  ProfileRequestError,
} from "@/lib/profileServer";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const snapshot = await adminDb.collection("users").doc(user.uid).get();
    const path = snapshot.data()?.profile?.photoPath;
    if (
      snapshot.data()?.profile?.avatarMode !== "custom" ||
      !ownedAvatarPath(path, user.uid)
    )
      throw new ProfileRequestError("No uploaded profile photo.", 404);
    const image = await readProfilePhoto(
      path,
      user.uid,
      snapshot.data()?.profile?.photoStore,
    );
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
