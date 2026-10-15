# Contest journal

`/journal` is private to the signed-in account. It stores manually entered results,
review notes, topic tags, an upsolving checklist, and reference links. Entries can
be created and edited; bookmarks or emails never count as participation by themselves.

## Behavior

- The participation choices are Participated, Skipped, and To upsolve. Results are
  explicitly labeled as manually entered. Rank, score and solved count are optional;
  a zero solved count is preserved rather than displayed as missing.
- What went well, mistakes, and lessons are separate optional review fields.
- Each entry supports up to 12 topics (including custom topics), 30 checklist
  problems and 10 labeled reference links. Links must use HTTPS and cannot contain
  embedded login credentials. Text is rendered as text, not HTML.
- Checklist completion tracks practice after the contest and does not change the
  number of problems solved during the contest. Checkboxes save immediately; the
  editor saves its draft only when Save entry / Save changes is pressed.
- Filters cover platform, status, topic, date range and search through names and
  notes/problem data. Dates are inclusive IST calendar dates. Entries are paginated
  in groups of 20. The three totals cover the entire account journal, not only the
  current filtered page.
- Prefill choices include the 100 most recent started contests owned through
  bookmarks, reminders or delivery history. Already logged contests are marked.
  One linked entry per account/contest is enforced by a unique database index.
  Contests missing from saved history can be recorded manually.
- A linked entry keeps a historical snapshot of its contest details. Removing a
  bookmark or a later feed change does not rewrite the entry or block note edits.
- Requests use the verified account identity, ignoring client-supplied user IDs.
  The new table has RLS enabled with no direct browser policies. API responses are
  private/no-store; email addresses and provider payloads are never returned.
- Update requests include a revision. Concurrent/stale writes receive 409 rather
  than overwriting a newer entry. Failed saves retain the editor draft. Dirty drafts
  require confirmation to close, with a browser unload warning while editing.
- Changing accounts hides the previous snapshot immediately. Filter requests are
  debounced and cancelled, and previous results are labeled if refresh fails.

## Deployment

Apply `npm run db:migrate` before deploying. Migration `0003_contest_journal` adds
only the journal table, foreign keys and indexes. It does not rewrite existing
contest results, profiles, bookmarks or reminders. No new service or credentials
are needed. The existing `contest_results` foundation is preserved for future
provider integrations; journal results are not claimed to be provider-verified.

## Verification

`npm run test:journal` uses local in-memory PostgreSQL and fake Auth. It covers
owner isolation, private headers, validation/body limits, HTTPS safety, canonical
prefills, historical candidates, duplicate prevention, revision conflicts,
independent checklist updates, search/filter/date pagination and RLS.
It sends no network requests or emails.
