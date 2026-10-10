import { adminDb, profileBucket } from "./firebaseAdmin";
import { ownedAvatarPath } from "./profileServer";

export type PhotoStore = "firestore" | "storage";
let bucketAvailable: { value: boolean; expires: number } | null = null;
async function chooseStore(): Promise<PhotoStore> {
  if (process.env.PROFILE_PHOTO_BACKEND === "firestore") return "firestore";
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "true"
  )
    return "firestore";
  if (!bucketAvailable || bucketAvailable.expires < Date.now()) {
    const [exists] = await profileBucket().exists();
    bucketAvailable = { value: exists, expires: Date.now() + 300000 };
  }
  return bucketAvailable.value ? "storage" : "firestore";
}
function photoDocument(path: string, uid: string) {
  if (!ownedAvatarPath(path, uid)) throw new Error("Invalid photo reference");
  return adminDb
    .collection("users")
    .doc(uid)
    .collection("profilePhotos")
    .doc(
      path
        .split("/")
        .at(-1)!
        .replace(/\.webp$/, ""),
    );
}
export async function saveProfilePhoto(
  path: string,
  uid: string,
  image: Buffer,
): Promise<PhotoStore> {
  if (image.length > 192 * 1024 || !ownedAvatarPath(path, uid))
    throw new Error("Invalid profile image");
  const store = await chooseStore();
  if (store === "firestore")
    await photoDocument(path, uid).set({
      image,
      contentType: "image/webp",
      createdAt: new Date(),
    });
  else
    await profileBucket()
      .file(path)
      .save(image, {
        resumable: false,
        contentType: "image/webp",
        metadata: { cacheControl: "private, max-age=300" },
      });
  return store;
}
export async function readProfilePhoto(
  path: string,
  uid: string,
  store: unknown,
): Promise<Buffer> {
  if (!ownedAvatarPath(path, uid)) throw new Error("Invalid photo reference");
  if (store === "firestore") {
    const snapshot = await photoDocument(path, uid).get();
    const image: unknown = snapshot.data()?.image;
    if (!Buffer.isBuffer(image)) throw new Error("Photo unavailable");
    return image;
  }
  const [image] = await profileBucket().file(path).download();
  return image;
}
export async function deleteProfilePhoto(
  path: string,
  uid: string,
  store: unknown,
) {
  if (!ownedAvatarPath(path, uid)) return;
  if (store === "firestore") await photoDocument(path, uid).delete();
  else await profileBucket().file(path).delete({ ignoreNotFound: true });
}
