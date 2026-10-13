// Explicit, rerunnable copy. Source Firestore records are never edited/deleted.
import { config } from "dotenv";
import { and, eq, isNull } from "drizzle-orm";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { getDatabase } from "../src/lib/db";
import {
  bookmarks,
  contests,
  deliveries,
  reminders,
  users,
  accountIdentities,
} from "../src/lib/db/schema";
import { normalizeProfile } from "../src/lib/profile";
import { parseAsUTC } from "../src/lib/date";
import { uploadPhoto, downloadPhoto, checkPhotoStorage } from "../src/lib/photoStorage";
config({ path: ".migration-backups/legacy.env", quiet: true });
config({ path: ".env.local", quiet: true, override: true });
const apply = process.argv.includes("--apply");
if (apply && !process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before applying the import.");
const { adminAuth, profileBucket } = await import("./legacyFirebase.mts");
const source = getFirestore(adminAuth.app);
if (apply) await checkPhotoStorage();
const counts = {
  users: 0,
  bookmarks: 0,
  reminders: 0,
  expiredReminders: 0,
  photos: 0,
  failedUsers: 0,
  googleIdentities: 0,
};
console.log(
  apply
    ? "Copying legacy records to PostgreSQL. Firestore will remain unchanged."
    : "Dry run: inspecting legacy data. No database writes, uploads, or emails.",
);
let cursor: string | undefined;
try {
  while (true) {
    const query = source.collection("users").orderBy("__name__").limit(100);
    const batch = await (cursor ? query.startAfter(cursor) : query).get();
    if (batch.empty) break;
    for (const document of batch.docs) {
      counts.users++;
      try {
        const legacy = document.data();
        const [saved, scheduled] = await Promise.all([
          document.ref.collection("bookmarks").get(),
          document.ref.collection("reminders").get(),
        ]);
        counts.bookmarks += saved.size;
        counts.reminders += scheduled.size;
        const photo = legacy.profile?.photoPath;
        if (legacy.profile?.avatarMode === "custom") counts.photos++;
        for (const item of scheduled.docs) {
          const data = item.data();
          if (
            parseAsUTC(data.start).getTime() -
              Number(String(data.reminderType).replace("h", "")) * 3600000 <=
            Date.now()
          )
            counts.expiredReminders++;
        }
        const legacyIdentity = await adminAuth.getUser(document.id);
        const googleSubject = legacyIdentity.providerData.find((provider) => provider.providerId === "google.com")?.uid;
        if (googleSubject) counts.googleIdentities++;
        else throw new Error("Legacy account needs an explicit identity migration");
        if (!apply) continue;
        const db = getDatabase();
        await db
          .insert(users)
          .values({
            id: document.id,
            email: legacy.email ?? null,
            name: legacy.displayName ?? null,
            googlePhotoUrl: legacy.photoURL ?? null,
          })
          .onConflictDoNothing();
        const [current] = await db
          .select()
          .from(users)
          .where(eq(users.id, document.id));
        if (googleSubject) {
          await db.insert(accountIdentities).values({ provider: "google", subject: googleSubject, userId: document.id }).onConflictDoNothing();
          const [mapping] = await db.select().from(accountIdentities).where(and(eq(accountIdentities.provider, "google"), eq(accountIdentities.subject, googleSubject)));
          if (mapping.userId !== document.id) throw new Error("Google identity mapping conflict; review before cutover");
        } else {
          throw new Error("Legacy account needs an explicit identity migration");
        }
        if (
          !current.profile &&
          current.profileRevision === 0 &&
          legacy.profile
        ) {
          if (legacy.profile.avatarMode === "custom") {
            if (
              typeof photo !== "string" ||
              !photo.startsWith(`profile-photos/${document.id}/`) ||
              photo.split("/").length !== 3
            )
              throw new Error("Invalid legacy photo path");
            let bytes: Buffer;
            if (legacy.profile.photoStore === "firestore") {
              const photoId = photo
                .split("/")
                .at(-1)!
                .replace(/\.webp$/, "");
              const storedBytes = (
                await document.ref
                  .collection("profilePhotos")
                  .doc(photoId)
                  .get()
              ).data()?.image;
              if (!Buffer.isBuffer(storedBytes))
                throw new Error("Legacy photo is unavailable");
              bytes = storedBytes;
            } else {
              [bytes] = await profileBucket().file(photo).download();
            }
            await uploadPhoto(photo, bytes);
            const copied = await downloadPhoto(photo);
            if (createHash("sha256").update(bytes).digest("hex") !==
                createHash("sha256").update(copied).digest("hex"))
              throw new Error("Photo copy verification failed");
          }
          await db
            .update(users)
            .set({
              profile: normalizeProfile(legacy.profile),
              avatarMode: ["custom", "none"].includes(legacy.profile.avatarMode)
                ? legacy.profile.avatarMode
                : "google",
              photoPath: legacy.profile.avatarMode === "custom" ? photo : null,
              profileRevision: legacy.profileRevision ?? 0,
              profileUpdatedAt: legacy.profileUpdatedAt
                ? new Date(legacy.profileUpdatedAt)
                : null,
            })
            .where(
              and(
                eq(users.id, document.id),
                isNull(users.profile),
                eq(users.profileRevision, 0),
              ),
            );
        }
        for (const [kind, snapshot] of [
          ["bookmark", saved],
          ["reminder", scheduled],
        ] as const) {
          for (const item of snapshot.docs) {
            const data = item.data();
            const id = Number(data.contestId ?? item.id);
            const start = parseAsUTC(data.start);
            const url = new URL(data.href);
            if (
              !Number.isSafeInteger(id) ||
              id <= 0 ||
              !Number.isFinite(start.getTime()) ||
              url.protocol !== "https:"
            )
              throw new Error("Invalid legacy contest record");
            await db
              .insert(contests)
              .values({
                id,
                event: String(data.event),
                host: String(data.host),
                href: url.toString(),
                start,
                duration: Math.max(0, Math.round(Number(data.duration) || 0)),
              })
              .onConflictDoNothing();
            if (kind === "bookmark") {
              await db
                .insert(bookmarks)
                .values({ userId: document.id, contestId: id })
                .onConflictDoNothing();
              continue;
            }
            const type = String(data.reminderType);
            const dueAt = new Date(
              start.getTime() - Number(type.replace("h", "")) * 3600000,
            );
            if (!["1h", "6h", "24h"].includes(type))
              throw new Error("Invalid legacy reminder type");
            if (dueAt <= new Date() || data.sent) continue; // Retain expired records in Firestore; do not send stale reminders.
            const identity = await adminAuth.getUser(document.id);
            if (!identity.email || !identity.emailVerified)
              throw new Error("Reminder owner needs a verified email");
            await db.transaction(async (tx) => {
              await tx
                .select()
                .from(users)
                .where(eq(users.id, document.id))
                .for("update");
              const [existing] = await tx
                .select()
                .from(reminders)
                .where(
                  and(
                    eq(reminders.userId, document.id),
                    eq(reminders.contestId, id),
                  ),
                );
              if (existing) return;
              const [delivery] = await tx
                .insert(deliveries)
                .values({
                  userId: document.id,
                  contestId: id,
                  reminderType: type,
                  email: identity.email!,
                  event: String(data.event),
                  href: url.toString(),
                  contestStart: start,
                  dueAt,
                })
                .returning();
              await tx
                .insert(reminders)
                .values({
                  userId: document.id,
                  contestId: id,
                  deliveryId: delivery.id,
                });
            });
          }
        }
      } catch (error) {
        counts.failedUsers++;
        // No emails, private profile fields, or credential strings in logs.
        console.error(
          "A user import needs attention:",
          error instanceof Error ? error.name : "UnknownError",
        );
      }
    }
    cursor = batch.docs.at(-1)!.id;
  }
  console.log(
    JSON.stringify({ mode: apply ? "apply" : "dry-run", ...counts }, null, 2),
  );
  if (counts.failedUsers) process.exitCode = 1;
} finally {
  const cache = globalThis as typeof globalThis & {
    contestPool?: { end(): Promise<void> };
  };
  await cache.contestPool?.end();
}
