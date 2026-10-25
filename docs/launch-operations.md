# Launch controls and deployment

Implemented 25 October 2026. This is an implementation/runbook, not proof that a new production deployment or real inbox test has happened.

## Where to find things

- Account menu → **Settings & privacy** (`/settings`): default timing, pause-all, getting-started checklist, JSON/CSV/photo exports and account deletion.
- **Help & feedback** (`/support`): public support address `guptaaarav987@gmail.com`, private authenticated feedback and recent-message status.
- `/admin`: existing delivery dashboard plus an administrator-only feedback inbox. `ADMIN_AUTH_USER_IDS` still governs every admin request on the server; displaying an admin link grants no access.
- Footer: support, privacy and terms. The four main navigation items stay unchanged.
- Journal → **Delete entry**: irreversible, owner/revision checked, with confirmation. Counts are recomputed from remaining entries.

## Reminder behavior

New choices are **15 minutes, 1 hour, 3 hours**. Default is 15 minutes; a saved preference moves that choice first in the bell menu. Choices whose send time has passed are disabled. Existing 6/24-hour jobs remain readable and retain their original provider payload/time. Nothing bulk-reschedules old mail.

The normal path submits a scheduled email to Resend immediately after saving. Five-minute Supabase Cron is recovery/cancellation, not the normal timing mechanism. Exact inbox arrival is not guaranteed. Pausing marks every pending/scheduled/uncertain delivery for cancellation, removes active reminder mappings and blocks new saves. Already sent mail cannot be recalled. Resume does not restore cancelled reminders.

Beta safety limits: 20 reminder creations per account per rolling 24 hours; 80 creations across the app per rolling 24 hours; 80 non-cancelled/expired/failed deliveries per UTC due date. Cancellations do not refund creation slots. The global budget row serializes concurrent accounts. These caps reserve headroom against Resend Free's published 100/day, 3,000/month; other sends from the same Resend account still count. They do not increase provider quotas or enable paid service. See [Resend pricing](https://resend.com/pricing).

Other controls: authenticated reads 240/minute, writes 60/minute, exports 5/hour, deletion starts 3/hour, feedback 5/day and 100 retained messages per account, bookmarks 500/account, journal 1,000 entries/account. Rate records use hashed owner prefixes and PostgreSQL atomic counters shared between instances. A 429 includes Retry-After where a window applies. Invalid requests never create delivery jobs.

## Account deletion

1. Export anything needed first; sign in with Google again if the server's last sign-in is older than ten minutes.
2. Type `DELETE`. The API locks the owner, marks the account deleting, disables new requests and creates a durable job. The browser generates a random 256-bit status receipt before POST, enabling idempotent recovery of the same request.
3. Pending email cancellations run immediately when possible and through the existing recovery worker. Cleanup waits at least two minutes for earlier uploads and waits for every active email/lease to clear. Uncertain provider results fail closed and may require administrator reconciliation.
4. The worker removes only the owner's storage prefix, confirms it is empty, deletes that Supabase Auth identity, and then transactionally removes application records and associated mail events. It handles foundational owned-team foreign keys too. External Google accounts are unaffected.
5. The completed job clears its account/Auth identifiers. The opaque receipt remains seven days, then is pruned. Unfinished jobs are not silently dropped when a receipt expires. Pending jobs and provider failures are visible in health checks; contact support if delayed.

Deletion starts are never part of smoke tests against production. Offline integration tests inject a fake photo/Auth provider. Existing provider logs and sent mail cannot be removed by deleting an application row. Before restoring older backups, apply all deletion requests since their capture; see the recovery guide.

## Feedback

Subjects/messages are bounded and stored as text, never rendered as HTML. Owner APIs return only the signed-in account's latest 20 messages. Administrator inbox shows the latest 50 open/resolved messages; resolving messages reveals older open ones. No automatic support email is sent. The owner can reply manually using the account email; automated tests never send replies. Feedback disappears with account deletion.

## Monitoring

- `/api/health`: coarse public database/recovery status, no user records or counts. Returns 503 for unreachable database, stale/failed worker, overdue mail, recent failed/bounced/uncertain deliveries or deletion stuck beyond an hour. A new deployment without a worker run is deliberately degraded.
- `/api/jobs/monitor`: `Authorization: Bearer CRON_SECRET`; checks health and can send one operational alert per six hours. Add optional **server-only** `OPERATIONS_ALERT_EMAIL=guptaaarav987@gmail.com` in Vercel to enable it; omitted means no alert emails. The alert contains coarse counts only. Failed attempts are throttled too. Tests inject a sender; implementation work does not send a real alert.
- `.github/workflows/health.yml`: polls public health every 15 minutes and, if repository secret `CRON_SECRET` exists, invokes the private monitor. Enable Actions notifications for failed workflows. Schedules can be delayed and are not a timing SLA. The public check still fails visibly if the secret is absent. Resend-based alerts cannot independently detect a broken Resend sender; GitHub failed-run notifications are the independent signal.
- Existing `/admin` has delivery details. A delivered webhook means acceptance by the recipient server, not proof of inbox placement or reading.

## Deploy the changes

1. Migration `0005_launch_controls` adds five private RLS tables and `users.account_state`; existing records remain active. It was applied successfully to the configured Supabase database during implementation. Apply `npm run db:migrate` on any other environment before deploying this code. There are no anonymous/authenticated browser policies on the new tables; only server-owned database operations access them.
2. Push code only when ready. Vercel must build the new commit; redeploying an old commit won't add these features. No push/deployment is performed by the implementation task.
3. Keep the existing Supabase/Resend/Auth/cron environment variables. Optional monitor email goes in Vercel; the same existing `CRON_SECRET` can be a GitHub repository secret for the monitor. Never expose secrets with NEXT_PUBLIC. No new paid service is required.
4. Configure an encryption key and secure off-site destination for backups as described in [backup and recovery](backup-recovery.md). The script is available but an actual backup schedule/destination is an owner setup task.
5. Run CI. `npm run test:offline` is network-free (PGlite/fake providers). Browser regression definitions run in GitHub via `npm run test:e2e`; they cover signed-out routes, viewport overflow, private API denial, light default and keyboard skip link. Signed-in real OAuth, email and account deletion are separate human acceptance steps.
6. Check light/dark/mobile, export data, create/cancel a disposable reminder, review delivery in Resend/admin and verify a real inbox. Test deletion only with a deliberately created disposable account, never the owner account. Read the Privacy/Terms copy before public launch.

## Implementation verification

Local lint, structure, TypeScript, offline integration/unit suites, production build and dependency audit are recorded in `launch-readiness.md`. CUA browser checks use the built app for public/private gates and isolated component previews with sample data for authenticated settings/feedback/deletion dialogs. They do not constitute real Google OAuth or email delivery tests.

CI uses the current official [checkout](https://github.com/actions/checkout) and [setup-node](https://github.com/actions/setup-node) actions with Node 24. The checkout token is not persisted into the build workspace.
