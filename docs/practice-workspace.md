# To practise

The journal’s **To practise** view lives at `/journal?view=practice`. It collects
problems from every entry owned by the signed-in account, independently of the
20-entry journal page. It adds no navbar item, paid service, credentials or table.

## Using the workspace

Add a problem to an existing journal entry, then open **To practise**. The default
queue shows unfinished problems. Filters cover platform, entry topic, priority,
status and problem/contest/takeaway search. My week can link to an exact planned
date. Results are paginated 20 at a time and ordered by unfinished state, earliest
planned date, priority (High, Normal, Low), contest date and stable IDs. Undated
problems follow dated ones. Totals cover the whole account, not the filtered page.

Each card has an explicit **Mark revisited** / **Practise again** action and a
**Plan & takeaway** disclosure. Priority, planned IST date and an optional
1,000-character takeaway save together. An empty date clears the plan. Unsaved
drafts disable filtering/refresh/pagination and warn on browser unload. Failed
saves keep drafts; revision conflicts reload the latest entry and let the user
review and resubmit. A retry is explicit; no silent overwrite occurs.

Marking a problem revisited does not change its contest's solved count, rank,
participation status or score. These are manually recorded practice checkboxes,
not platform-verified solves. Entry tags describe the whole contest review.

## Storage and completion dates

Data stays in Supabase PostgreSQL, in `journal_entries.data.problems`. The
existing JSONB records gain optional `priority`, `plannedDate`, `takeaway` and
`completedAt` properties. Older problems default to Normal priority and no plan
or takeaway. Existing completed problems keep an unknown completion date. No
database migration is required beyond the existing journal migration `0003`.

The server owns completion dates. A false-to-true transition records the current
server timestamp; editing a checked problem preserves it. Reopening clears it;
marking it again records a new timestamp. Client-supplied dates are ignored.
Full journal edits preserve practice metadata even when sent by an older client
that omits the new fields. This is the current completion state, not an immutable
history of every practice session.

## My week and Progress

My week shows unfinished problems planned from today through the next six days
in IST, separately from contests. It previews six planned problems and links
back to the full queue for the rest (the API reads at most 100). Overdue problems remain in To practise.
Practice dates do **not** create or schedule email reminders.

Progress keeps the existing checklist-by-contest-date panel and adds **Practice
over time**. Its monthly counts use recorded completion dates in IST, filtered by
the selected platform, including completions from contests older than the
reporting period. Unknown legacy dates are excluded, rather than backfilled.
Reopening a problem removes its current completion from these totals.

## API and verification

- `GET /api/journal/practice` verifies the access token and queries only the
  verified owner’s records. It returns queue metadata and selected problem data,
  not review notes, account information or email data. A page beyond the last
  available page is clamped to the last page.
- `PATCH /api/journal/practice` accepts entry ID/revision, problem ID and practice
  fields. It cannot rename the problem, change its URL or alter contest results.
  The owner-scoped revision comparison prevents lost updates across queue rows,
  the journal editor and other tabs. Request size is limited to 8 KB.
- Both endpoints are private and uncached. Existing journal RLS stays enabled;
  browser database access is not added.

Run `npm run test:practice` for the in-memory PostgreSQL/API suite. It checks
ownership, pagination across all entries, filtering, bounds, narrow updates,
conflicts, server timestamps, legacy compatibility, weekly plans and dated
progress. It makes no real network requests and sends no emails. Also run lint,
typecheck, journal/week/progress/loading checks and a production build.
