# Personalised discovery

The landing page and `/contests` show up to three suggestions above the existing
calendar. Choose preferences opens an inline editor; Tune your picks edits saved
choices. No navbar item, paid service, external recommendation API or tracking is
added.

Users can choose up to 12 favourite platforms, any combination of days, a start
time window and an optional 1/2/3-hour duration ceiling. All scheduling preferences
use IST. Empty platform/day choices mean no preference. Reset restores neutral
choices; the enable switch temporarily stops personalised ranking.

## Ranking

Only upcoming contests with valid starts are eligible. Rank by favourite platform
(4 points), matching day (2), matching start window (2) and known duration within
the chosen ceiling (1). Ties use earliest start and then contest ID. Reasons expose
the actual matches instead of implying verified ability or predicting outcomes.
These are soft preferences: a partial match can be suggested. If none match,
explain that and show the next rounds. No preferences or disabled personalisation
shows the soonest rounds. Invalid starts, elapsed contests and duplicates are
excluded. Zero/unknown duration never receives a duration-match label.

Morning is 06:00–12:00, afternoon 12:00–18:00, evening 18:00–00:00 and night
00:00–06:00, using the contest's IST start day. Days and start time do not promise
the entire contest fits a free window. No difficulty or skill inference is made.

The normal calendar and its search, filters and sort remain separate. Suggestions
never add bookmarks, journal entries or reminders on a user's behalf.

## Storage and deployment

Migration `0006_lively_tombstone.sql` adds nullable JSONB `discovery` to the existing
RLS-protected `account_preferences` table. Apply it before deploying. Existing rows
use neutral defaults. `/api/account/settings` validates discovery, uses verified
ownership and optimistic revisions, and returns private/no-store responses.
Older clients omitting discovery preserve its current value. Discovery editing
preserves other account settings, including reminder choices. Stale drafts receive
a conflict notice rather than silently replacing another edit.

Guests use `algolap-discovery-v1` in local storage, with corrupt-data fallback and
cross-tab updates. Storage errors retain the draft and show a save error. Guest
choices never silently overwrite a signed-in account. Sign-out/account changes
switch the visible preferences. Authenticated preferences are included in account
JSON export and normal encrypted backups, and cascade with account deletion.

## Checks

`npm run test:discovery` covers ranking/reasons, no-preference/disabled behavior,
no matches, invalid dates, duplicates, unknown durations, IST boundaries, validation,
authenticated API ownership, revision conflicts, exports and compatibility with
older reminder-settings clients. It uses in-memory PostgreSQL and fake Auth.
