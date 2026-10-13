# PostgreSQL and reminder rollout

The application uses Next.js/React, Drizzle + PostgreSQL, Firebase Authentication,
Supabase Free Storage for uploaded photos, and Resend for scheduled reminder emails.
Firestore is now only a source for the explicit one-time import script.

## Configure services

1. Provision a PostgreSQL database (Neon or another managed PostgreSQL service).
   Set `DATABASE_URL` in `.env.local` and the deployment environment. Use your
   provider's pooled URL for the app; set `DIRECT_DATABASE_URL` for migrations
   when the provider recommends a separate direct URL. Keep TLS enabled for
   hosted databases. Never expose these through `NEXT_PUBLIC_*` variables.
2. Retain the existing Firebase Auth configuration and service account. Do not
   enable Firebase Blaze for photos. Create a private Supabase Free bucket using
   [the setup guide](free-photo-storage.md). Configure `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY`, and `SUPABASE_PHOTO_BUCKET` locally and on deployment.
   Firebase Storage is only read by the importer if a legacy photo lives there.
3. Verify a sending domain in Resend, including its required DNS records. Set
   `RESEND_FROM` to a sender on that domain; the application rejects `resend.dev`
   test senders. Keep `RESEND_API_KEY` server-only.
4. Configure a Resend webhook at `/api/webhooks/resend` for `email.sent`,
   `email.delivered`, `email.bounced`, `email.failed`, and `email.suppressed`.
   Set the signing secret as `RESEND_WEBHOOK_SECRET`. Invalid signatures are
   rejected. Delivery history is stored without copying email bodies into logs.
5. Generate a random `CRON_SECRET` of at least 32 bytes, configure it in the
   deployment environment and GitHub Actions secrets, and set the repository
   variable `APP_URL` to the actual deployed origin (https). The workflow calls
   `/api/jobs/reminders` every five minutes as a retry/recovery mechanism.
   GitHub Actions scheduling is best effort, not an exact delivery clock.

Run `npm run check:services` to check the required configuration, database schema,
and photo-bucket availability without sending email. It prints no secret values.

## Migrate existing data

Back up/export Firestore first using Firebase/Google Cloud's supported tooling.
Do not remove the legacy records or credentials during the rollback period.

```sh
npm ci
npm run db:migrate
npm run db:import-firestore
```

The import defaults to a dry run: it counts records without writing PostgreSQL,
uploading files, or sending email. For the actual copy:

```sh
npm run db:import-firestore -- --apply
```

Pause the old reminder workflow and put the old deployment into maintenance mode
before the final import, so users cannot write to two data stores simultaneously.
The script preserves Firebase UIDs, copies profiles/bookmarks/future reminders,
copies legacy photos into private Supabase Storage and verifies their bytes, and leaves
Firestore untouched. Existing PostgreSQL profile edits are not overwritten.
Expired reminders remain in the source and are not queued for stale email sends.
An interrupted import can be rerun; a nonzero exit means some records need review.
Do not cut over until counts and representative user records/photos are verified.

Deploy the new application, check sign-in/profile/bookmark/reminder operations,
then enable the new retry workflow. Saving a reminder immediately queues a
provider-scheduled email through Next.js `after`; no cron run is required for
the normal path. The durable outbox retries interrupted requests and preserves
failures instead of deleting them. Schedule changes cancel the previous provider
email before scheduling the replacement. Cancellation cannot recall email that
has already been sent.

For rollback, pause the new worker first and cancel/reconcile outstanding
provider-scheduled emails before re-enabling the old sender. Otherwise both
systems could send the same reminder. Restore the previous application and
export/reconcile new PostgreSQL writes; do not assume Firestore contains writes
made after cutover.

## Verify delivery and operations

- Run `npm run test:backend`, `npm run typecheck`, `npm run lint`, and
  `npm run build`. Backend tests use an in-memory PostgreSQL engine and a fake
  mail provider. They do not connect to live accounts or send emails.
- Run `npm run test:profile` against the isolated local database and Firebase Auth emulator and local Supabase Storage described in the README to verify authenticated HTTP saves and photos.
- With an explicitly chosen test recipient, save a real future reminder and
  verify its scheduled time in Resend, its signed webhook events, and its actual
  arrival. Provider acceptance and inbox delivery are different events.
- Inspect `reminder_deliveries`: `pending` means awaiting provider acceptance;
  `scheduled` means accepted; `sent` and `delivered` come from provider events.
  `failed`/`bounced` require attention. `uncertain` means a previous request may
  have succeeded but cannot safely be retried automatically.
- Retry requests use a stable delivery ID and an immutable provider payload.
  Database leases prevent normal concurrent claims. Resend idempotency keys
  expire after 24 hours; unresolved ambiguous sends are stopped after 23 hours
  and require manual reconciliation, rather than risking duplicates.
- Monitor pending job age, failed/uncertain deliveries, worker failures and
  provider bounces. Alert on these through your hosting/monitoring service.
- Resend can schedule up to 30 days ahead; the worker uses a 29-day horizon.
  A late recovery can send before contest start, but never intentionally sends
  after the contest begins. Mailbox filtering and provider outages can still
  delay delivery; no email service guarantees exact inbox arrival.

Teams, memberships and contest-results tables are relational foundations for
future product features; their user-facing flows are not part of this migration.
