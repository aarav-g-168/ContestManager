# Weekly goals

My week and Progress share a private **Weekly goals** card. There is no new page
or navbar item. Goals cover Monday 00:00 through the following Monday 00:00 in
IST, independently of the device timezone, My week's rolling seven-day planner,
or Progress's month/platform filters. The card explicitly says **All platforms**.

Set separate targets for contests entered (0–21) and problems revisited (0–500).
Zero leaves a target off. Progress can exceed a target; the progress bar caps at
100%, while the actual count remains visible. Targets are for the current week
only. A new week starts without targets; earlier saved rows remain unchanged.
No email reminders, automatic participation or streaks are created.

## Counting rules

- Contests count only journal entries marked **Participated**, using their contest
  date in IST, from this Monday through today. Skipped, To upsolve, prior-week and
  future-dated entries do not count. These are manually recorded entries, not
  verified platform participation.
- Practice counts currently completed journal problems with a server-recorded
  `completedAt` during the week and no later than now. The contest may be older.
  Legacy completions without dates are excluded. Reopening a problem removes its
  current completion; marking it again records a new completion date.
- Queries cover the account's entire journal, independently of pagination, and
  return counts only. Notes, problem titles, emails and account details are not
  exposed by the goals endpoint.

## Storage and API

Migration `0004_weekly_goals` creates `weekly_goals` in Supabase PostgreSQL with
`user_id`, Monday `week_start`, both targets, `revision` and `updated_at`. The
composite key permits one row per owner/week. Database constraints enforce target
bounds and Monday dates; RLS is enabled with no direct-browser policies.

`GET /api/goals` and `PUT /api/goals` verify Supabase access tokens and use the
resolved account owner. Client-supplied user IDs are ignored. Successful responses
are `private, no-store` and vary on Authorization. Writes are limited to 2 KB.

PUT checks that the submitted week is still current. A null revision creates a
new row only; subsequent saves compare revisions. Concurrent edits and week
rollover return 409. The editor retains its draft and shows the latest saved
targets so the user can choose **Keep my changes** or **Load saved targets**.
Simply refreshing background counts never advances an open editor's revision.

The card loads independently of the page, refreshes on focus and every visible
minute, and offers manual refresh. A loading skeleton, retry state, labeled old
snapshot on network failures, saved-feedback toast, inline validation, keyboard
focus management, and unsaved-change confirmation are included. Account changes
hide the previous account immediately. Light remains the default theme.

## Deployment and verification

Run `npm run db:migrate` against each deployment's Supabase database before
deploying code. The migration is additive and does not rewrite existing journal
data. No new service, environment variable or paid plan is needed.

`npm run test:goals` uses PGlite and fake authentication without network calls or
emails. It covers ownership, RLS, request limits, validation and SQL constraints,
revision conflicts, pagination-independent counts, reopened/undated practice,
week rollover, IST midnight, year boundaries and leap years. Existing page
skeleton checks also render the weekly-goals loading component.
