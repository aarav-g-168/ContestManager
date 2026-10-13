# Supabase Free setup and cutover

One Supabase project now supplies PostgreSQL, Google sign-in, private photos, and
Cron recovery. Next.js stays on Vercel. Resend sends emails; CLIST supplies contest
schedules; Cloudflare manages DNS. There is no Firebase runtime dependency or
Neon connection in the active application configuration.

## Project and credentials

1. Create `contest-manager` in a **Free** organization. Do not attach paid upgrades.
2. Copy the project URL and publishable API key (legacy `anon` also works) from
   Connect / Settings > API Keys. Copy the server secret key separately (legacy
   `service_role` also works). Never expose that secret to the browser.
3. Connect > Connection string > **Session pooler**, port **5432**, provides an
   IPv4-compatible URL for local development, migrations and the application's
   small connection pool. Insert the database password where the dashboard
   shows a placeholder, URL-encoding special characters. Keep TLS enabled.
   The API secret and database password are different credentials.
4. Set `.env.local` and later Vercel's environment:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   SUPABASE_PHOTO_BUCKET=profile-photos
   DATABASE_URL=YOUR_SESSION_POOLER_POSTGRES_URL
   DIRECT_DATABASE_URL=YOUR_SESSION_POOLER_POSTGRES_URL
   APP_URL=https://contest-manager.vercel.app
   ```

   A direct URL also works for migrations if your network supports its address
   family. Do not use the old Neon URL. Keep existing Resend, CLIST and CRON_SECRET
   values. Never paste private keys/URLs into chat or tracked files.

## Google login

1. Supabase > Authentication > Sign In / Providers > Google: enable Google.
2. In Google Cloud's Google Auth Platform, use your existing project's OAuth
   configuration or create a Web application OAuth client. Add application origins
   `http://localhost:3000`, `http://127.0.0.1:3000` and the production website.
3. Add the exact **Supabase callback URL** shown on its Google provider page to
   Google's authorized redirect URIs. It ends with `/auth/v1/callback`.
4. Put the Google client ID and secret into the Supabase provider settings and save.
   They are not application environment variables. Configure the consent screen
   and test users if the Google app is in testing mode.
5. Supabase > Authentication > URL Configuration: set Site URL to your production
   website, and allow `http://localhost:3000/`, `http://127.0.0.1:3000/` and the
   production origin with `/` as redirect URLs. OAuth uses PKCE and returns home.
   No custom Supabase domain or paid Auth add-on is required.
6. Leave account writes disabled until the legacy import below is verified.

## Private photos

Storage > New bucket: name `profile-photos`, **Public off**, allowed MIME type
`image/webp`, file-size limit **192 KB**. Do not add public/client access policies.
Only authenticated Next.js routes access photos through the server secret key.

## Schema and legacy data

1. Run `npm run db:migrate`. This applies both initial tables and identity/RLS
   migration. All application tables have RLS enabled with no browser policies;
   privileged server SQL connections perform access checks in the API routes.
2. Run `npm run check:services` and `npm run db:import-firestore` (read-only).
3. Back up Firestore, disable the old live reminder workflow and stop old account
   writes. Keep backups private. The locally retired credentials are preserved in
   ignored `.migration-backups/legacy.env`; only the explicit importer reads them.
4. Run `npm run db:import-firestore -- --apply`. It copies profiles, bookmarks,
   future reminders, and private photos; photo bytes are verified after copying.
   It never deletes Firestore or schedules provider email itself.
5. The import stores each Firebase account's Google provider subject in a private
   mapping table. On Supabase Google login, the API verifies the token with Auth
   and resolves that same Google subject to the original account ID. Editable
   metadata or matching email alone cannot claim an old account. Users sign in
   again; Firebase sessions do not transfer. Non-Google legacy accounts require
   an explicit mapping and cause import failure rather than silent data loss.
6. Review all import failures and verify representative records before opening
   account writes. Do not allow new Supabase account writes before importing;
   doing so can create separate new and legacy account records.
7. If any account data was written to Neon after the earlier schema setup, reconcile
   it separately before cutover. The Firestore importer does not copy Neon writes.

## Deploy and enable recovery

1. Run backend/photo tests, lint, typecheck and build. Add the new environment values
   to Vercel and deploy. Remove old Firebase variables and Neon URLs from Vercel
   only as part of that deployment. Keep Resend webhook signing configuration.
2. Verify Google sign-in, existing profile recovery, photo upload/replacement,
   bookmarks and reminders. Choose your own account for a real email test.
3. Run `npm run setup:cron` for a dry run. After the deployed worker is verified,
   run `npm run setup:cron -- --apply`. This enables pg_cron/pg_net, stores the
   application URL and CRON_SECRET in Supabase Vault, and schedules the recovery
   endpoint every five minutes. It is rerunnable; no secret is in cron's command.
4. Check Supabase Cron execution history **and** pg_net HTTP response status:
   SQL successfully enqueueing an HTTP call does not prove the worker succeeded.
   Supabase Free pauses/outages can stop recovery; scheduling normal emails in
   advance with Resend reduces reliance on recovery timing.
5. The old GitHub workflow file is removed locally, but disable any old deployed
   workflow until the updated branch is published. Never leave both senders active.

## Retirement and rollback

Do not delete Firebase or Neon cloud projects until data migration and the live
application are verified and the rollback period ends. Their integrations are
removed from the app; preserving source data is deliberate. Firebase Admin is a
**development-only** dependency for the one-time importer. After verification,
remove that importer/dependency and retire its service-account credential.

For rollback, unschedule `contest-manager-reminder-recovery` first and reconcile
all outstanding Resend scheduled emails before restoring the old sender. New
Supabase writes are absent from Firestore and need reconciliation. Keep a source
backup; the Free plan does not include automatic database backups and can pause
after inactivity. Staying Free does not provide unlimited usage or an uptime SLA.

Official references:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/cron/quickstart
- https://supabase.com/pricing
