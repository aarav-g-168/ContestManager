import { profileBucket } from "./firebaseAdmin";
import { ownedAvatarPath } from "./profileServer";
export type PhotoStore = "storage";
export async function saveProfilePhoto(
  path: string,
  uid: string,
  image: Buffer,
): Promise<PhotoStore> {
  if (image.length > 192 * 1024 || !ownedAvatarPath(path, uid))
    throw new Error("Invalid profile image");
  await profileBucket()
    .file(path)
    .save(image, {
      resumable: false,
      contentType: "image/webp",
      metadata: { cacheControl: "private, max-age=300" },
    });
  return "storage";
}
export async function readProfilePhoto(
  path: string,
  uid: string,
  store: unknown,
): Promise<Buffer> {
  if (!ownedAvatarPath(path, uid) || store !== "storage")
    throw new Error("Invalid profile image");
  const [image] = await profileBucket().file(path).download();
  return image;
}
export async function deleteProfilePhoto(
  path: string,
  uid: string,
  store: unknown,
) {
  if (!ownedAvatarPath(path, uid) || store !== "storage") return;
  await profileBucket().file(path).delete({ ignoreNotFound: true });
}
