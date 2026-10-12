import { config } from "dotenv";
import { getDatabase } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
config({ path: ".env.local", quiet: true });
const checks: Record<string, string> = {};
let ready = true;
for (const name of ["DATABASE_URL", "RESEND_FROM", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "CRON_SECRET"]) {
  checks[name] = process.env[name] ? "configured" : "missing";
  if (!process.env[name]) ready = false;
}
if (process.env.DATABASE_URL) {
  try { await getDatabase().select({ id: users.id }).from(users).limit(1); checks.databaseSchema = "reachable"; }
  catch { checks.databaseSchema = "unavailable or migrations not applied"; ready = false; }
}
try {
  const { profileBucket } = await import("../src/lib/firebaseAdmin");
  const [exists] = await profileBucket().exists();
  checks.photoBucket = exists ? "available" : "not created";
  if (!exists) ready = false;
} catch { checks.photoBucket = "unavailable; check server credentials and bucket configuration"; ready = false; }
if (process.env.RESEND_FROM && /@resend\.dev\b/i.test(process.env.RESEND_FROM)) { checks.RESEND_FROM = "test sender; use a verified domain"; ready = false; }
if (process.env.CRON_SECRET && Buffer.byteLength(process.env.CRON_SECRET) < 32) { checks.CRON_SECRET = "must be at least 32 bytes"; ready = false; }
checks.senderDomainVerification = "Verify in the Resend dashboard; no test email was sent";
console.log(JSON.stringify({ ready, checks }, null, 2));
const cache = globalThis as typeof globalThis & { contestPool?: { end(): Promise<void> } };
await cache.contestPool?.end();
if (!ready) process.exitCode = 1;
