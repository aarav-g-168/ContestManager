import { config } from "dotenv";
import { getDatabase } from "../src/lib/db";
import { users, accountIdentities } from "../src/lib/db/schema";
config({ path: ".env.local", quiet: true });
const checks: Record<string, string> = {};
let ready = true;
for (const name of ["DATABASE_URL", "RESEND_FROM", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "CRON_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
  checks[name] = process.env[name] ? "configured" : "missing";
  if (!process.env[name]) ready = false;
}
if (process.env.DATABASE_URL) {
  try { await getDatabase().select({ id: users.id }).from(users).limit(1); await getDatabase().select().from(accountIdentities).limit(1); checks.databaseSchema = "reachable (including account migration)"; }
  catch { checks.databaseSchema = "unavailable or migrations not applied"; ready = false; }
}
try {
  const { checkPhotoStorage } = await import("../src/lib/photoStorage");
  await checkPhotoStorage();
  checks.photoBucket = "available and private (Supabase)";
} catch { checks.photoBucket = "unavailable; configure Supabase credentials and a private bucket"; ready = false; }
if (process.env.RESEND_FROM && /@resend\.dev\b/i.test(process.env.RESEND_FROM)) { checks.RESEND_FROM = "test sender; use a verified domain"; ready = false; }
if (process.env.CRON_SECRET && Buffer.byteLength(process.env.CRON_SECRET) < 32) { checks.CRON_SECRET = "must be at least 32 bytes"; ready = false; }
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Auth settings unavailable");
    const settings = await response.json();
    checks.googleLogin = settings.external?.google ? "enabled" : "disabled; configure Google provider in Supabase";
    if (!settings.external?.google) ready = false;
  } catch { checks.googleLogin = "unavailable; check Supabase URL and publishable key"; ready = false; }
}
checks.senderDomainVerification = "Verify in the Resend dashboard; no test email was sent";
console.log(JSON.stringify({ ready, checks }, null, 2));
const cache = globalThis as typeof globalThis & { contestPool?: { end(): Promise<void> } };
await cache.contestPool?.end();
if (!ready) process.exitCode = 1;
