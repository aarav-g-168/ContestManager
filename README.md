# Contest Manager

A programming contest calendar with platform filters, bookmarks, email reminders,
Google Calendar links, and editable profiles. Contest schedules come from CLIST.

[Live deployment](https://contest-manager.vercel.app) ·
[Aarav Gupta](https://aarav.site)

Application data, Google sign-in and private photos use Supabase. Apply the versioned SQL migrations before deploying code that depends on new tables.

## Features

- Browse upcoming contests, search by name/platform, and filter by date.
- Switch grid/list views and sort by start time, duration, or platform.
- Save bookmarks across devices after Google sign-in.
- Request reminder emails 15 minutes, 1 hour, or 3 hours before a contest.
- Add contest details to Google Calendar.
- Plan the next seven days in My week, with saved rounds, reminder statuses and schedule overlaps.
- Keep a private contest journal with manual results, review notes, topics, problem checklists and reference links.
- Review monthly participation, recorded solves, upsolving completion, platform totals and journal topics in Progress.
- Edit a personal bio, coding handles, social links, and a custom profile photo.
- Set weekly contest/practice goals and manage a cross-journal practice queue.
- Manage reminder preferences, download account data and request account deletion.
- Send private feedback, with an admin-only inbox; public support, privacy and terms pages.
- Use light or dark mode; light is the default.

Profiles are private account settings, not public pages. Google account metadata
is kept separate from custom profile details. Profile saves check a revision to
prevent one browser tab from overwriting another tab's changes. Photos are
validated, stripped of metadata, converted to WebP, and stored in private object
storage. Authenticated API requests serve them; replacements are cleaned up.

## Stack

| Purpose           | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| Application       | Next.js 16, React 19, TypeScript                     |
| UI                | Tailwind CSS, Radix/shadcn, Motion, Lucide           |
| Application data  | Supabase PostgreSQL and Drizzle ORM                  |
| Sign-in           | Supabase Auth (Google, PKCE)                         |
| Uploaded photos   | Supabase Storage (Free plan, private bucket)         |
| Contest schedules | CLIST, cached for 30 minutes                         |
| Email             | Resend scheduled emails and signed delivery webhooks |
| Recovery worker   | Authenticated endpoint, triggered by Supabase Cron   |

The SQL schema includes users, contests, bookmarks, reminders, delivery history,
and foundational tables for teams, memberships, and contest results. Teams and
platform ratings do not yet have product flows. Private progress analytics are
derived from journal entries; see [Progress](docs/progress.md).

## Project structure

Product code lives in `src/features/`, Next.js routes in `src/app/`, shared UI in
`src/components/`, and common infrastructure in `src/lib/`. Tests live in
`tests/integration/`; scripts are grouped into checks, setup and legacy migration
tools. See the [folder map and one-line file responsibilities](docs/project-structure.md).
Run `npm run check:structure` to verify placement and client/server boundaries;
this also runs with `npm run lint`.

## Local setup

Use Node.js 24 (`.nvmrc`) and a PostgreSQL database. Copy `.env.example` to
`.env.local`, fill in your own credentials, then run:

```sh
npm ci
npm run db:migrate
npm run check:services
npm run dev
```

One Supabase Free project handles the database, Google login and private photos.
Follow [Supabase setup and cutover](docs/supabase-setup.md) before deployment.
Configure the variables in `.env.example`; `DATABASE_URL` uses the transaction
pooler, while `DIRECT_DATABASE_URL` may use a direct or session-pooler connection
for migrations. The server secret must never be exposed with `NEXT_PUBLIC_*`.

The one-time Firestore importer preserves existing Google account ownership via
verified provider subjects and copies private photos. It reads retired credentials
only from ignored `.migration-backups/legacy.env`. Firebase Admin is a development
migration dependency; no Firebase SDK is used by the application. Source projects
remain intact until cutover is verified. Never import while the old writer/sender
is active or enable new account writes before the identity import is complete.

## Email delivery

Saving a reminder writes a durable outbox record. A background task submits the
email to Resend with its scheduled time. The normal path does not wait for a cron
invocation. The recovery worker retries failed/interrupted submissions, using
database leases and provider idempotency keys to reduce duplicate sends. Changing
a reminder cancels the previous provider email before scheduling its replacement.

The UI distinguishes scheduling, scheduled, sent, delivered, and failed emails.
Failures are retained for review. A saved reminder does not mean an email has
already been delivered, and no provider can guarantee exact inbox arrival.

Production setup requires a verified `RESEND_FROM`, `RESEND_API_KEY`, and signed
webhook at `/api/webhooks/resend` with `RESEND_WEBHOOK_SECRET`. The protected worker
uses `CRON_SECRET`. Configure `APP_URL` to the deployed HTTPS origin, then run
`npm run setup:cron -- --apply` after deployment verification to set up five-minute
Supabase Cron recovery with credentials stored in Vault. The old GitHub reminder
workflow is removed. Free-project pauses can interrupt recovery; advance email
scheduling does not depend on a cron invocation for the normal path.

## Checks

```sh
npm run test:offline
npm run test:admin
npm run test:week
npm run test:journal
npm run test:progress
npm run test:loading
npm run test:practice
npm run test:goals
npm run test:email
npm run test:photos
npm run typecheck
npm run lint
npm run build
```

Backend tests use a PostgreSQL engine in memory and a fake email provider. They
check relational ownership/constraints, profile revisions, scheduling,
concurrent claims, cancellation, lost responses, retries, delivery events, and
expired reminders. They do not access live databases or send mail.

The separate profile HTTP integration suite requires local Supabase Auth/Storage,
a PostgreSQL database on `127.0.0.1` with `test` in its name, and a test app on
port 3001. Both processes need the same local Supabase URL, publishable key,
server secret and private bucket. Start the app with `PROFILE_TEST_MODE=true`
and the test database as `DATABASE_URL`. Set `PROFILE_TEST_DATABASE_URL` to the
same URL in the test process, then run `npm run test:profile`. The suite creates
and removes local Auth users. Never use production credentials for these tests.

## Deployment

Configure production environment variables, apply SQL migrations with
`npm run db:migrate`, and deploy to a Node.js-compatible Next.js host. Enable the
new worker only after importing and checking existing data. See the Supabase cutover guide
for rollback precautions: scheduled provider emails must be reconciled before
re-enabling the old sender.

Local skills under `.agents/skills/` and `.codex/skills/` stay ignored and must
never be committed or pushed.

## Author

[Aarav Gupta](https://aarav.site) ·
[GitHub](https://github.com/aarav-g-168) ·
[LinkedIn](https://linkedin.com/in/aaravgupta168)

## Private operations dashboard

`/admin` provides delivery metrics, searchable history and scheduler/webhook health.
Access uses the server-only `ADMIN_AUTH_USER_IDS` allowlist of verified Supabase
Auth IDs. See [admin setup and metric definitions](docs/admin-dashboard.md).

## Personal weekly planner

`/week` combines your saved rounds and reminders for the next seven IST calendar
days, with a next-round countdown, day filters, real email statuses and overlap
checks. See [My week behavior and verification](docs/my-week.md).

## Contest journal

`/journal` records manually entered contest results and review notes, with saved
contest prefills, topic/date/status filters and an upsolving checklist. Apply the
additive journal migration before deploying. See [journal behavior and checks](docs/contest-journal.md).

## Launch controls

See [launch controls and deployment](docs/launch-operations.md), [encrypted backup and recovery](docs/backup-recovery.md), and the [release checklist](docs/launch-readiness.md). GitHub CI includes browser regression definitions; production health checks are separate from the reminder scheduler. Backups are application-data exports, not complete Supabase/Auth/Storage recovery. No paid services are enabled.

### Personalised discovery

Home and the contest calendar offer explained suggestions using favourite platforms,
available days, IST start times and contest length. Account choices sync privately
through Supabase; visitors can save choices in their browser. Apply migration 0006
before deploying. See [personalised discovery](docs/personalized-discovery.md) and run
`npm run test:discovery` for ranking and persistence checks.
