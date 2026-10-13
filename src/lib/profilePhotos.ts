import { uploadPhoto, downloadPhoto, removePhoto } from "./photoStorage";
import { ownedAvatarPath } from "./profileServer";
export type PhotoStore = "storage";
export async function saveProfilePhoto(
  path: string,
  uid: string,
  image: Buffer,
): Promise<PhotoStore> {
  if (image.length > 192 * 1024 || !ownedAvatarPath(path, uid))
    throw new Error("Invalid profile image");
  await uploadPhoto(path, image);
  return "storage";
}
export async function readProfilePhoto(
  path: string,
  uid: string,
  store: unknown,
): Promise<Buffer> {
  if (!ownedAvatarPath(path, uid) || store !== "storage")
    throw new Error("Invalid profile image");
  return downloadPhoto(path);
}
export async function deleteProfilePhoto(
  path: string,
  uid: string,
  store: unknown,
) {
  if (!ownedAvatarPath(path, uid) || store !== "storage") return;
  await removePhoto(path);
}
