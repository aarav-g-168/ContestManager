# Project structure

Code is grouped by product feature. Next.js owns URLs in `src/app/`; the code
behind each page lives in `src/features/`. Shared UI and infrastructure have
their own folders. Moving files does not change website URLs, database tables,
environment variables, email schedules or the names of existing npm commands.

## Folder map

```text
contestManager/
├── src/
│   ├── app/                  Next.js pages, layouts and HTTP endpoints
│   │   ├── api/              Authenticated APIs, Resend webhook and recovery job
│   │   └── <route>/          Page and loading state for each existing URL
│   ├── features/             Product code grouped by what it does
│   │   ├── account/          Preferences, onboarding, export and durable deletion
│   │   ├── operations/       Coarse health signals and deduplicated alerts
│   │   ├── support/          Private feedback, admin inbox, contact and legal copy
│   │   ├── admin/            Private reminder operations dashboard
│   │   ├── auth/             Google sign-in, sessions and account identity
│   │   ├── bookmarks/        Saved-contest state and actions
│   │   ├── contests/         Contest browsing, calendar helpers and CLIST feed
│   │   ├── goals/            Weekly targets and journal-based completion counts
│   │   ├── home/             Landing-page sections and discovery interactions
│   │   ├── journal/          Contest reviews, manual results and checklists
│   │   ├── profile/          Personal details, profile editor and private photos
│   │   ├── progress/         Journal-based participation and practice analytics
│   │   ├── reminders/        Reminder state, Resend delivery and recovery worker
│   │   └── week/             Seven-day planner, saved rounds and overlap checks
│   ├── components/           UI shared across product features
│   │   ├── layout/           Navigation, branding, footer and page headings
│   │   ├── feedback/         Application notifications
│   │   ├── theme/            Light/dark provider and theme switch
│   │   └── ui/               Reusable Radix/shadcn controls and visual primitives
│   ├── hooks/                Generic hooks, currently the shared clock
│   ├── lib/                  Shared infrastructure and small generic utilities
│   │   ├── db/               PostgreSQL connection, Drizzle client and schema
│   │   ├── http/             Request authentication, body limits and error responses
│   │   ├── security/         Persistent request budgets and job authentication
│   │   └── supabase/         Browser Supabase client
│   └── styles/               Theme tokens, global CSS and shared layout styles
├── public/                   Images, icons and files served directly
├── tests/
│   ├── integration/          Existing API, PostgreSQL and storage verification suites
│   └── fixtures/             Shared sample data when needed by tests
├── scripts/
│   ├── checks/               Structure checks and service diagnostics
│   ├── setup/                Explicit infrastructure setup tools
│   └── legacy/               Retired Firebase backup, import and verification tools
├── drizzle/                  Versioned SQL migrations and migration metadata
├── docs/                     Feature behavior, setup and architecture notes
├── .env.example              Variable names and safe setup examples
├── .env.local                Private local credentials; ignored by Git
└── AGENTS.md                 Persistent project preferences and placement rules
```

`.agents/skills/`, `.codex/skills/`, `.migration-backups/`, `node_modules/`, and
generated `.next/` output stay local and ignored. Skills must never be staged or
copied into tracked code. `drizzle/` is migration history, not generated build
output to delete or rearrange.

## Inside a feature

The journal shows the pattern. Features create only the folders they need:

```text
src/features/journal/
├── components/
│   ├── ContestJournal.tsx    Journal screen, list, filters and sign-in states
│   ├── JournalEditor.tsx     Entry form and unsaved-change handling
│   └── JournalContestPicker.tsx Searchable contest dropdown inside the editor
├── hooks/
│   └── useJournal.ts         Authenticated loading, refresh and save requests
├── lib/
│   └── journal.ts            Types, validation, default values and filter rules
├── server/
│   └── journal.ts            Owner-scoped PostgreSQL reads and writes
└── styles.css                Journal and editor styling
```

`components/` contains React UI; `hooks/` connects UI to client state and APIs;
`lib/` contains rules that can safely run without credentials; `server/` contains
backend queries, credentials and integrations. `types.ts` is available for a
feature-wide type such as `features/contests/types.ts`. Avoid creating empty
placeholder folders or a combined client/server `index.ts` barrel.

Bookmarks and reminders reuse the contest browser for their list screens, so
they do not need duplicate components merely to fill out this pattern.

## Important files, one line each

| File                                                  | Responsibility                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/app/layout.tsx`                                  | Loads fonts, global styles, providers, navigation and footer.                     |
| `src/app/page.tsx`                                    | Composes the landing page from discovery sections.                                |
| `src/app/<route>/page.tsx`                            | Defines a page’s URL, metadata and initial server data.                           |
| `src/app/api/**/route.ts`                             | Handles HTTP requests and connects them to feature logic.                         |
| `src/features/auth/components/AuthProvider.tsx`       | Manages the browser’s signed-in account and Google login flow.                    |
| `src/features/auth/server/auth.ts`                    | Verifies access tokens and resolves stable account ownership.                     |
| `src/features/auth/server/account.ts`                 | Creates or updates the verified user’s account record.                            |
| `src/features/auth/lib/client-api.ts`                 | Makes authenticated requests from browser code.                                   |
| `src/features/contests/components/ContestBrowser.tsx` | Renders and filters discovery, bookmark and reminder contest lists.               |
| `src/features/contests/server/get-contests.ts`        | Fetches upcoming contests from CLIST with the existing cache policy.              |
| `src/features/contests/server/recent-contests.ts`     | Loads a cached recent contest feed for journal prefills without prior bookmarks.  |
| `src/features/contests/server/feed.ts`                | Wraps feed loading with recoverable error information.                            |
| `src/features/contests/server/verify-contest.ts`      | Validates a selected contest against the trusted feed before saving it.           |
| `src/features/contests/lib/calendar.ts`               | Calculates IST contest dates and calendar days.                                   |
| `src/features/contests/lib/platforms.ts`              | Defines platform names, visual identities and host matching.                      |
| `src/features/profile/server/storage.ts`              | Reads and writes private profile photos through Supabase Storage.                 |
| `src/features/reminders/server/service.ts`            | Saves or cancels reminders and their durable delivery records.                    |
| `src/features/reminders/server/queue.ts`              | Claims and submits queued deliveries, retries and records mail events.            |
| `src/features/reminders/server/email.ts`              | Builds the reminder email and communicates with Resend.                           |
| `src/features/reminders/server/recovery-worker.ts`    | Runs reminder recovery and records worker health.                                 |
| `src/features/week/server/week.ts`                    | Reads the account’s saved contests and reminders for the planner.                 |
| `src/features/progress/lib/progress.ts`               | Calculates monthly totals, coverage and checklist completion.                     |
| `src/features/progress/server/progress.ts`            | Selects only the signed-in account’s permitted analytics inputs.                  |
| `src/features/admin/server/access.ts`                 | Enforces the server-side admin allowlist.                                         |
| `src/features/admin/server/overview.ts`               | Queries reminder metrics, delivery history and system health.                     |
| `src/lib/db/schema.ts`                                | Defines database tables, relations, indexes and ownership fields.                 |
| `src/lib/db/index.ts`                                 | Creates and reuses the application’s PostgreSQL connection pool.                  |
| `src/lib/db/connection.ts`                            | Normalizes the runtime connection to the Supabase transaction pooler.             |
| `src/lib/http/account-request.ts`                     | Authenticates API requests and returns safe error responses.                      |
| `src/lib/http/request-body.ts`                        | Limits and parses incoming request bodies.                                        |
| `src/lib/http/request-error.ts`                       | Defines the shared request error and HTTP status.                                 |
| `src/lib/supabase/browser.ts`                         | Creates the browser client using public Supabase configuration.                   |
| `src/lib/date.ts`                                     | Parses contest timestamps consistently as UTC.                                    |
| `src/lib/utils.ts`                                    | Combines CSS class names for shared controls.                                     |
| `src/hooks/useClock.ts`                               | Supplies a shared live clock for countdowns and time-sensitive screens.           |
| `src/components/theme/ThemeProvider.tsx`              | Applies the saved appearance preference, defaulting to light mode.                |
| `src/styles/globals.css`                              | Defines theme tokens, base styles and shared CSS imports.                         |
| `src/styles/components.css`                           | Holds existing shared component and application layout rules.                     |
| `src/styles/discovery.css`                            | Holds landing-page and contest-browsing layout overrides.                         |
| `scripts/checks/structure.mjs`                        | Checks file placement, imports, entry points and client/server boundaries.        |
| `drizzle.config.ts`                                   | Configures schema generation and migration database access.                       |
| `next.config.ts`                                      | Configures Next.js and includes the database CA certificate in deployment output. |
| `components.json`                                     | Tells shadcn where shared UI, utilities and global CSS live.                      |
| `supabase-ca.crt`                                     | Supplies the public CA certificate needed for verified database TLS.              |

Some existing shared HTTP function names retain `Profile` for compatibility with
the current internal callers; they now live in the common HTTP folder rather than
inside the profile feature. Their behavior has not changed.

## How a request travels

For the journal: `app/journal/page.tsx` loads the journal UI; `useJournal.ts`
requests `/api/journal`; the route verifies the account and calls
`features/journal/server/journal.ts`; that module uses `lib/db/` to read or write
Supabase PostgreSQL. The result returns to the hook and updates the screen.

Database and service secrets remain on that server path. Browser components may
import shared types with `import type`, but must not import server code at runtime.

## Keeping it consistent

1. Add product work inside its feature, and reuse shared controls from `components/ui/`.
2. Use PascalCase component filenames and `useName.ts` hook filenames. Existing
   shadcn primitive filenames retain their generator’s naming convention.
3. Use explicit `@/features/...` and `@/lib/...` paths in application code; tests
   and operational scripts use relative source imports.
4. Features may reuse another feature’s pure helpers or UI through explicit paths;
   features must not import Next.js route modules from `app/`.
5. Keep runtime server dependencies in `server/` or shared server infrastructure.
   Type-only imports do not count as runtime dependencies.
6. Put tests in `tests/integration/`; add `unit/` or `e2e/` only when there are tests
   for them, and shared sample data in `tests/fixtures/`. Keep setup tools and
   legacy importers away from application code.
7. Update this guide and `AGENTS.md` when introducing a new architectural convention.

Run `npm run check:structure` for the automated checks. `npm run lint` also runs
this check, so misplaced source files, unresolved local imports and client runtime
paths reaching server/database/Node-only modules fail normal linting. TypeScript,
the existing feature tests and a production build remain necessary after broad
refactors; the structure check does not replace them.

## Loading components

Each page has a `loading.tsx` that imports its feature’s standalone skeleton.
Reuse that component during the first client fetch rather than importing a full
dashboard controller into a route fallback. Shared shapes and loading semantics
live in `components/feedback/LoadingSkeleton.tsx`; the pulse uses global theme
tokens and respects reduced-motion preferences. See [loading behavior and
verification](loading-states.md). Run `npm run test:loading` to check page coverage.

## Practice workspace

The practice queue stays inside `features/journal/`, alongside its source
entries. `components/PracticeQueue.tsx` renders cards and filters;
`hooks/usePractice.ts` handles authenticated requests and conflict recovery;
`lib/practice.ts` defines queue types and query validation;
`server/practice.ts` reads the owner’s full queue and applies narrow problem
updates. `components/JournalNavigation.tsx` connects Entries and To practise.
`app/api/journal/practice/route.ts` is the HTTP boundary. My week reuses the
server’s planned-problem query; Progress independently aggregates completion
timestamps. See [practice workspace](practice-workspace.md).

## Weekly goals

`features/goals/components/WeeklyGoals.tsx` provides the shared My week/Progress
card and editor. `hooks/useWeeklyGoals.ts` handles account-scoped loading, saving
and refresh; `lib/goals.ts` owns IST week boundaries, types and validation;
`server/goals.ts` handles owner-scoped persistence and counts. The route boundary
is `app/api/goals/route.ts`; migration `0004_weekly_goals` adds the private table.
See [weekly goals](weekly-goals.md) for counting and rollover rules.

The reminder HTML lives in `features/reminders/server/email-template.ts`;
`email.ts` prepares its content and owns the Resend adapter. See
[reminder email layout](reminder-email.md) for responsive behavior, previews and
the rule that scheduled provider payloads must stay immutable.

## Launch operations

`features/account/` owns settings, first-use guidance, data exports and durable deletion jobs. `features/support/` owns feedback validation/storage, public contact and privacy/terms content; admin feedback requests still pass the existing admin allowlist. `features/operations/server/` checks health and sends optional throttled alerts. `lib/security/` holds shared atomic request limits and cron-token checks.

`app/api/account/` exposes private settings/export/deletion routes, with a capability-based deletion-receipt status endpoint. `api/feedback`, `api/admin/feedback`, `api/health` and `api/jobs/monitor` are their HTTP boundaries. Public support/privacy/terms and private settings have their own pages/loading files. `app/sitemap.ts`, `robots.ts`, and `opengraph-image.tsx` provide public metadata.

`scripts/setup/backup*.mts` and `restore.mts` implement encrypted application-data recovery; `.backups/` stays ignored. Tests live in `tests/integration/launch.test.mts` and `tests/e2e/launch.spec.ts`; CI definitions live in `.github/workflows/`. See [launch operations](launch-operations.md) and [backup recovery](backup-recovery.md) for limits and deployment steps.
