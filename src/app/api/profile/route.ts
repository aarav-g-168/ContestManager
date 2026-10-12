import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensureAccount } from "@/lib/accountServer";
import {
  deleteProfilePhoto,
  saveProfilePhoto,
  type PhotoStore,
} from "@/lib/profilePhotos";
import {
  normalizeProfile,
  validateProfile,
  type SavedProfile,
} from "@/lib/profile";
import {
  authenticateProfile,
  ownedAvatarPath,
  profileErrorResponse,
  ProfileRequestError,
  readSavedProfile,
} from "@/lib/profileServer";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await authenticateProfile(request);
    const account = await ensureAccount(user);
    return NextResponse.json(
      {
        profile: readSavedProfile(
          {
            profile: { ...account.profile, avatarMode: account.avatarMode },
            profileRevision: account.profileRevision,
            profileUpdatedAt: account.profileUpdatedAt?.toISOString(),
          },
          user,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}

async function readLimitedForm(request: Request) {
  const max = 6 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    throw new ProfileRequestError("Choose a photo smaller than 5 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader)
    throw new ProfileRequestError("The profile form was empty.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new ProfileRequestError("Choose a photo smaller than 5 MB.", 413);
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new ProfileRequestError(
      "We couldn’t read the profile form. Please try again.",
      400,
    );
  }
}

export async function PUT(request: Request) {
  let uploadedPath: string | null = null;
  let uploadedStore: PhotoStore | null = null;
  let authenticatedUid: string | null = null;
  let committed = false;
  try {
    const user = await authenticateProfile(request);
    authenticatedUid = user.uid;
    const form = await readLimitedForm(request);
    let input: unknown;
    try {
      input = JSON.parse(String(form.get("profile")));
    } catch {
      throw new ProfileRequestError(
        "Check your profile details and try again.",
        400,
      );
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ProfileRequestError(
        "Check your profile details and try again.",
        400,
      );
    const values = normalizeProfile(input);
    const errors = validateProfile(values);
    if (Object.keys(errors).length)
      return NextResponse.json(
        { error: "Check the highlighted fields.", errors },
        { status: 400 },
      );
    const revision = Number(form.get("revision"));
    if (!Number.isSafeInteger(revision) || revision < 0)
      throw new ProfileRequestError("Reload your profile and try again.", 400);
    const avatarAction = form.get("avatarAction");
    if (!["keep", "remove", "google"].includes(String(avatarAction)))
      throw new ProfileRequestError("Choose a valid photo option.", 400);
    const avatar = form.get("avatar");
    if (avatar instanceof File && avatar.size) {
      if (avatar.size > 5 * 1024 * 1024)
        throw new ProfileRequestError("Choose a photo smaller than 5 MB.", 413);
      if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type))
        throw new ProfileRequestError("Choose a JPG, PNG, or WebP photo.", 400);
      let image: Buffer;
      try {
        const source = sharp(Buffer.from(await avatar.arrayBuffer()), {
          limitInputPixels: 36000000,
          animated: false,
        });
        const metadata = await source.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
          throw new Error();
        image = await source
          .rotate()
          .resize(512, 512, { fit: "cover" })
          .webp({ quality: 82 })
          .toBuffer();
        if (image.length > 192 * 1024)
          image = await sharp(image)
            .resize(384, 384)
            .webp({ quality: 70 })
            .toBuffer();
      } catch {
        throw new ProfileRequestError(
          "This image couldn’t be opened. Try another JPG, PNG, or WebP photo.",
          400,
        );
      }
      uploadedPath = `profile-photos/${user.uid}/${randomUUID()}.webp`;
      uploadedStore = await saveProfilePhoto(uploadedPath, user.uid, image);
    }
    await ensureAccount(user);
    let previousPath: unknown;
    const profile = await getDatabase().transaction(async (transaction) => {
      const [account] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, user.uid))
        .for("update");
      if (account.profileRevision !== revision)
        throw new ProfileRequestError(
          "Your profile changed in another tab. Reload it before saving again.",
          409,
        );
      previousPath = account.photoPath;
      const avatarMode = uploadedPath
        ? "custom"
        : avatarAction === "remove"
          ? "none"
          : avatarAction === "google"
            ? "google"
            : account.avatarMode;
      const next: SavedProfile = {
        values,
        avatarMode: avatarMode as SavedProfile["avatarMode"],
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      };
      await transaction
        .update(users)
        .set({
          profile: values,
          avatarMode,
          photoPath:
            uploadedPath ??
            (avatarMode === "custom" && ownedAvatarPath(previousPath, user.uid)
              ? previousPath
              : null),
          profileRevision: next.revision,
          profileUpdatedAt: new Date(next.updatedAt!),
        })
        .where(eq(users.id, user.uid));
      return next;
    });
    committed = true;
    if (
      ownedAvatarPath(previousPath, user.uid) &&
      (uploadedPath || avatarAction !== "keep")
    )
      await deleteProfilePhoto(previousPath, user.uid, "storage").catch(() =>
        console.error("Previous profile photo cleanup failed"),
      );
    return NextResponse.json(
      { profile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (uploadedPath && uploadedStore && authenticatedUid && !committed)
      await deleteProfilePhoto(
        uploadedPath,
        authenticatedUid,
        uploadedStore,
      ).catch(() => console.error("Uncommitted profile photo cleanup failed"));
    return profileErrorResponse(error);
  }
}
