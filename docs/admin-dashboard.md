# Reminder operations dashboard

Open `/admin` while signed in. The account menu shows an Admin dashboard link only
after the server confirms access. All data is fetched from protected API routes;
the static page shell contains no delivery data.

## Access and deployment

- Set server-only `ADMIN_AUTH_USER_IDS` to the comma-separated **Supabase Auth user
  IDs** allowed to access operations. Use Auth IDs, not imported legacy account IDs.
- The selected administrator is configured in ignored `.env.local`. Copy that
  variable to Vercel Production and deploy the latest code. Never add a
  `NEXT_PUBLIC_` prefix. Changing the allowlist requires a deployment restart.
- Empty/unset configuration denies everyone. Unauthenticated requests receive
  401; users outside the allowlist or with unconfirmed email receive 403.
- The implementation never trusts editable user metadata, a client-side flag,
  or a matching legacy account ID to grant access. APIs use private/no-store
  responses and vary on Authorization. All telemetry tables have RLS enabled.
- Apply `npm run db:migrate` before deploying; migration 0002 adds a nullable
  provider timestamp and the private worker execution table. It preserves existing
  reminders and is compatible with the prior deployed worker/webhook handlers.

## Reading the dashboard

- Reporting periods are 7/30 **IST calendar days**, including today. Metrics and
  the activity chart use the reminder's creation-date cohort and current status.
- Delivery rate = delivered / (delivered + failed + bounced). Pending, scheduled,
  cancelled, expired and uncertain records are excluded. With no completed
  outcomes, show an em dash rather than a misleading success percentage.
- Mean send offset uses the signed provider `email.sent` event time minus the
  scheduled reminder time. Positive means late; negative means early. Its sample
  count is displayed. A send event is not proof of inbox arrival or reading.
- Received webhook time is stored separately from provider event time. Existing
  events without provider timestamps stay null; their receipt time is not used to
  fabricate delivery timing. Data collection begins with the new deployment.
- Needs attention includes failed/bounced/uncertain jobs, past-due pending jobs,
  and scheduled/sent jobs more than ten minutes past due without a final outcome.
  This view spans all dates so older unresolved problems remain visible. Waiting
  for an outcome is not automatically classified as a failed delivery.
- The searchable, paginated log masks recipient addresses and excludes email
  bodies, provider request payloads, API keys and lease tokens. Expand a delivery
  for provider times, attempts, next eligible retry, ID and sanitized error.

## Health and refresh

- Cron SQL success means an HTTP request was queued. It does not prove a successful
  endpoint response. Worker telemetry records actual authenticated recovery
  executions and their processing counts; it begins after this deployment.
- A worker execution older than 15 minutes is flagged as stale. Missing Cron
  privileges or telemetry is shown as unavailable/awaiting data, not healthy.
- Missing webhook events alone do not establish an outage. The latest receipt
  and event count in the selected period are shown without exposing payloads.
- Manual refresh is the default. Optional refresh runs every minute only while
  visible. Errors preserve a labeled previous snapshot; access denial clears it.
- Worker-run history is trimmed to 30 days during recovery to bound its storage.
  Delivery history is preserved. The dashboard is read-only: viewing or refreshing
  it cannot send, cancel, retry, or alter a reminder.

## Validation

`npm run test:admin` uses a local in-memory PostgreSQL engine and a mocked Auth
transport. It checks 401/403/200 behavior, metadata spoofing, unconfirmed users,
private caching, RLS, timing/deduplication, filters, pagination and masked results.
It does not connect to cloud services or send email. The other backend tests
continue to cover reminder scheduling and cancellation.
