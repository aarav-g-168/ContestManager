import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local", quiet: true });
const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!url || new URL(url).hostname.endsWith(".neon.tech"))
  throw new Error("Configure a Supabase database connection first");
if (
  !appUrl ||
  new URL(appUrl).protocol !== "https:" ||
  new URL(appUrl).origin !== appUrl.replace(/\/$/, "")
)
  throw new Error("Set APP_URL to your deployed HTTPS origin");
if (!secret || Buffer.byteLength(secret) < 32)
  throw new Error("Configure CRON_SECRET");
if (!process.argv.includes("--apply")) {
  console.log(
    "Dry run: would configure Supabase Cron + Vault. Deploy and verify the worker first, then run with --apply. No changes made.",
  );
  process.exit(0);
}
const pool = new Pool({
  connectionString: url,
  connectionTimeoutMillis: 10000,
});
const connection = await pool.connect();
try {
  await connection.query("begin");
  await connection.query("create extension if not exists pg_cron");
  await connection.query(
    "create extension if not exists pg_net with schema extensions",
  );
  // Keep credentials out of cron's visible command text. Values are parameterized
  // and stored in Supabase Vault; running setup again updates them in place.
  for (const [name, value] of [
    ["contest_manager_app_url", appUrl.replace(/\/$/, "")],
    ["contest_manager_cron_secret", secret],
  ]) {
    const existing = await connection.query(
      "select id from vault.secrets where name = $1",
      [name],
    );
    if (existing.rows[0])
      await connection.query("select vault.update_secret($1::uuid, $2::text)", [
        existing.rows[0].id,
        value,
      ]);
    else
      await connection.query("select vault.create_secret($1::text, $2::text)", [
        value,
        name,
      ]);
  }
  await connection.query("select cron.schedule($1, $2, $3)", [
    "contest-manager-reminder-recovery",
    "*/5 * * * *",
    `select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'contest_manager_app_url') || '/api/jobs/reminders',
      headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'contest_manager_cron_secret')),
      timeout_milliseconds := 60000
    );`,
  ]);
  await connection.query("commit");
  console.log(
    "Supabase reminder recovery configured every five minutes. No email sent by this script. Check Cron history and pg_net HTTP responses after the first run.",
  );
} catch {
  await connection.query("rollback");
  console.error(
    "Cron setup failed. Confirm pg_cron, pg_net and Vault availability and database-owner permissions.",
  );
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}
