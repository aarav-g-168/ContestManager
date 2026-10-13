import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../src/lib/db";
import { users, accountIdentities, reminders, deliveries } from "../src/lib/db/schema";
import { normalizeProfile } from "../src/lib/profile";
import { downloadPhoto } from "../src/lib/photoStorage";
config({ path: ".env.local", quiet: true });
const path = process.argv[2];
assert.ok(path?.startsWith(".migration-backups/"), "Choose the private source backup");
const raw = await readFile(path);
assert.equal(createHash("sha256").update(raw).digest("hex"), (await readFile(`${path}.sha256`, "utf8")).trim());
const backup = JSON.parse(raw.toString());
const db = getDatabase();
let checkedUsers = 0;
let checkedPhotos = 0;
try {
  for (const account of backup.accounts) {
    const original = backup.records.find((record: { path: string }) => record.path === `users/${account.id}`)?.data;
    assert.ok(original, "Source account document missing");
    const [copied] = await db.select().from(users).where(eq(users.id, account.id));
    assert.ok(copied, "Imported account missing");
    const subject = account.providerData.find((provider: { providerId: string }) => provider.providerId === "google.com")?.uid;
    const [mapping] = await db.select().from(accountIdentities).where(and(eq(accountIdentities.provider, "google"), eq(accountIdentities.subject, subject)));
    assert.equal(mapping?.userId, account.id, "Google identity does not match original account");
    if (original.profile) {
      assert.deepEqual(copied.profile, normalizeProfile(original.profile), "Profile does not match backup");
      assert.equal(copied.profileRevision, original.profileRevision ?? 0);
      if (original.profile.avatarMode === "custom") {
        assert.equal(copied.avatarMode, "custom");
        assert.equal(copied.photoPath, original.profile.photoPath);
        const photoId = copied.photoPath!.split("/").at(-1)!.replace(/\.webp$/, "");
        const bytes = backup.records.find((record: { path: string }) => record.path === `users/${account.id}/profilePhotos/${photoId}`)?.data?.image;
        assert.equal(bytes?.type, "bytes", "Photo bytes are missing from backup");
        assert.deepEqual(await downloadPhoto(copied.photoPath!), Buffer.from(bytes.base64, "base64"), "Photo differs from source bytes");
        checkedPhotos++;
      }
    }
    // This source export has only expired reminders; verify none became queued.
    assert.equal((await db.select().from(reminders).where(eq(reminders.userId, account.id))).length, 0, "Unexpected active reminder; review its source due time");
    assert.equal((await db.select().from(deliveries).where(eq(deliveries.userId, account.id))).length, 0, "Unexpected queued delivery");
    checkedUsers++;
  }
  console.log(JSON.stringify({ verifiedAccounts: checkedUsers, verifiedPhotos: checkedPhotos, identityMappingsMatch: true, expiredRemindersNotQueued: true, emailsSent: 0 }));
} finally {
  const cache = globalThis as typeof globalThis & { contestPool?: { end(): Promise<void> } };
  await cache.contestPool?.end();
}
