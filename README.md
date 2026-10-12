# Contest Manager

A programming contest calendar with platform filters, bookmarks, email reminders,
Google Calendar links, and editable profiles. Contest schedules come from CLIST.

[Live deployment](https://contest-manager.vercel.app) ·
[Aarav Gupta](https://aarav.site)

The code in this branch requires the PostgreSQL migration and service setup
below before deploying. The existing live deployment may still use the earlier
Firestore implementation.

## Features

- Browse upcoming contests, search by name/platform, and filter by date.
- Switch grid/list views and sort by start time, duration, or platform.
- Save bookmarks across devices after Google sign-in.
- Request reminder emails 1, 6, or 24 hours before a contest.
- Add contest details to Google Calendar.
- Edit a personal bio, coding handles, social links, and a custom profile photo.
- Use light or dark mode; dark is the default.

Profiles are private account settings, not public pages. Google account metadata
is kept separate from custom profile details. Profile saves check a revision to
prevent one browser tab from overwriting another tab's changes. Photos are
validated, stripped of metadata, converted to WebP, and stored in private object
storage. Authenticated API requests serve them; replacements are cleaned up.

## Stack

| Purpose | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS, Radix/shadcn, Motion, Lucide |
| Application data | PostgreSQL and Drizzle ORM |
| Sign-in | Firebase Authentication (Google) |
| Uploaded photos | Firebase Storage |
| Contest schedules | CLIST, cached for 30 minutes |
| Email | Resend scheduled emails and signed delivery webhooks |
| Recovery worker | Authenticated endpoint, triggered by GitHub Actions |

The SQL schema includes users, contests, bookmarks, reminders, delivery history,
and foundational tables for teams, memberships, and contest results. Teams and
analytics do not yet have product flows.

## Local setup

Use Node.js 24 (`.nvmrc`) and a PostgreSQL database. Copy `.env.example` to
`.env.local`, fill in your own credentials, then run:

```sh
npm ci
npm run db:migrate
npm run check:services
npm run dev
```

`DATABASE_URL` is the application's PostgreSQL connection. If your database
provider recommends a direct connection for migrations, set
`DIRECT_DATABASE_URL` too. Firebase Auth and Storage still use the Firebase
project settings and server service account. Credentials must stay in environment
files or deployment secrets, never source control.

For existing Firestore data, follow the [migration and rollout guide](docs/stack-migration.md).
The importer defaults to a read-only dry run and never deletes source records:

```sh
npm run db:import-firestore
# Only after backup, schema migration, and pausing the old writer/sender:
npm run db:import-firestore -- --apply
```

## Email delivery

Saving a reminder writes a durable outbox record. A background task submits the
email to Resend with its scheduled time. The normal path does not wait for a cron
invocation. The recovery worker retries failed/interrupted submissions, using
database leases and provider idempotency keys to reduce duplicate sends. Changing
a reminder cancels the previous provider email before scheduling its replacement.

The UI distinguishes scheduling, scheduled, sent, delivered, and failed emails.
Failures are retained for review. A saved reminder does not mean an email has
already been delivered, and no provider can guarantee exact inbox arrival.

Production setup requires:

- `RESEND_API_KEY` and `RESEND_FROM` on a verified sender domain.
- A signed Resend webhook at `/api/webhooks/resend` and its
  `RESEND_WEBHOOK_SECRET`.
- A random `CRON_SECRET` in both deployment secrets and GitHub Actions secrets.
- GitHub repository variable `APP_URL` containing the deployed https origin.

`.github/workflows/reminders.yml` calls `/api/jobs/reminders` every five minutes
for recovery. It fails on HTTP errors. The worker only accepts its secret; normal
user reminder operations require a verified Firebase user token.

## Checks

```sh
npm run test:backend
npm run typecheck
npm run lint
npm run build
```

Backend tests use a PostgreSQL engine in memory and a fake email provider. They
check relational ownership/constraints, profile revisions, scheduling,
concurrent claims, cancellation, lost responses, retries, delivery events, and
expired reminders. They do not access live databases or send mail.

The separate profile HTTP integration suite requires an isolated local PostgreSQL
database with `test` in its name, Firebase Auth/Storage emulators, and a test app.
Install the Firebase CLI and its Java prerequisite, then start the emulators:

```sh
firebase emulators:start --config firebase.emulators.json --project demo-contest-manager --only auth,storage
```

Start the test app on port 3001 with `NEXT_PUBLIC_FIREBASE_EMULATORS=true` and
`DATABASE_URL` pointing to that isolated test database. In another terminal set
`PROFILE_TEST_DATABASE_URL` to the same URL and run `npm run test:profile`.
This suite tests authenticated HTTP saves, photo processing/cleanup, account
isolation, and concurrent profile revisions. Test rules are not production rules.

## Deployment

Configure production environment variables, apply SQL migrations with
`npm run db:migrate`, and deploy to a Node.js-compatible Next.js host. Enable the
new worker only after importing and checking existing data. See the rollout guide
for rollback precautions: scheduled provider emails must be reconciled before
re-enabling the old sender.

Local skills under `.agents/skills/` and `.codex/skills/` stay ignored and must
never be committed or pushed.

## Author

[Aarav Gupta](https://aarav.site) ·
[GitHub](https://github.com/aarav-g-168) ·
[LinkedIn](https://linkedin.com/in/aaravgupta168)
