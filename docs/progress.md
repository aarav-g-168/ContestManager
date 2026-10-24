# Progress dashboard

`/progress` reads the signed-in account’s private journal. It adds no service,
subscription, environment variable, migration, or copied analytics table.
Deploy it with the existing journal migration (`0003_contest_journal`) applied.

## What it shows

- 3, 6, or 12 calendar months, including the current partial month, through today
  in IST. Filters use the contest date, not the date the entry was created.
- Recorded rounds across all statuses; entered rounds include only Participated.
- Solved totals include only Participated entries with a recorded count. A missing
  count is displayed as `—`; zero is a valid count. Coverage accompanies totals.
- Interactive monthly participation/solve bars, with month summaries, journal
  drilldowns, and an accessible monthly data table.
- Checklist completion across all entry statuses within the selected period.
  This is the current checkbox state, grouped by contest date.
- Practice over time counts dated completions by the month a problem was marked
  revisited in IST, including older contests. Unknown legacy dates are excluded.
  Reopening a problem removes that completion; checking it again records a new
  date. See [To practise](practice-workspace.md).
- Platform totals and the smallest manually entered rank among Participated
  rounds on that platform. Field sizes vary, so no cross-platform rank is shown.
- Entry tag frequency and recent entries. Tags describe journal topics, not
  measured strengths or weaknesses. Results are manually entered, not verified
  platform statistics.

Changing the time range or platform recalculates all panels. Period, platform,
topic, and recent-round links open the journal with validated initial filters.
Unknown or invalid journal URL filters fall back to the unfiltered journal.

The main navigation is Discover, My week, Journal, Progress. My week always links
to saved contests and reminders; these also remain in the account menu. The logo
opens the landing page.

## Privacy and refresh

`GET /api/progress?months=6&platform=codeforces.com` verifies the Supabase access
token and scopes every query to the verified stable account ID. Client parameters
cannot choose another account. Responses use `private, no-store` and
`Vary: Authorization`.

The SQL query selects only aggregate inputs: contest title/platform/date, status,
solved count, rank, checklist completion flags, dated completion counts and topic tags. It excludes review
notes, problem titles, reference URLs, user profiles and email data. It covers all
matching entries rather than the journal’s paginated response.

The client refreshes on focus, every minute while visible, and on demand. A failed
refresh preserves a clearly labeled previous snapshot. Account changes hide the
old account’s data immediately; aborted and superseded requests cannot overwrite
the latest response. Authorization failures clear the displayed snapshot.

## Verification

`npm run test:progress` exercises the real GET handler and PostgreSQL queries
against PGlite with all migrations. It covers account isolation, response caching,
status semantics, missing/zero counts, period boundaries (IST midnight, year and
leap year), platform filters, full-journal aggregation, topic deduplication, empty
accounts, excluded private fields and journal link parsing. It sends no emails
and makes no real network requests.

Run `npm run lint`, `npm run typecheck`, `npm run build`, and the existing journal
and week tests before deploying. Visually check desktop, tablet and mobile in
both themes; bars work as keyboard buttons, details have visible focus, and the
monthly table provides a text alternative to the chart.
