# My week

`/week` is a private planner for today and the following six IST calendar days.
Users enter it from the main navigation, account menu or home-page link. Profiles
remain accessible in the account menu.

## Schedule and privacy

- `/api/week` verifies the Supabase access token and resolves the stable account ID.
  Client parameters cannot select another account. Responses are private/no-store.
- The read-only query combines that account's bookmarks and reminders, returning
  each contest once. Email addresses, payloads, credentials and delivery IDs are
  excluded. Viewing the page never schedules or changes mail.
- Stored contests keep the planner available during a feed outage. A current feed
  entry takes precedence for display. If a reminder's saved start time differs,
  the page asks the user to review it; it never silently reschedules an email.
- Ended contests drop out; ongoing contests appear under Today, including rounds
  that began on an earlier day. Future rounds beyond the window are not counted
  in the weekly totals. All times are explicitly IST, matching the existing site.

## Interaction

- The next saved round has its start time, countdown and contest link.
- Select a day to filter the agenda; select it again or choose All 7 days to reset.
- Rows reuse the existing bookmark/reminder APIs and Google Calendar links.
  Reminder choices whose send times have passed are disabled. Removing a bookmark
  does not cancel its reminder; a reminder alone keeps a round in the planner.
- Overlaps use half-open intervals, so adjacent contests do not clash. Unknown
  durations are excluded, and a live overlap counts only its remaining time.
- Suggested contests are simply the earliest unsaved rounds in the public feed
  this week, not personalized rankings or recommendations from an AI model.
- Account data refreshes every minute while visible and on focus. Refresh failures
  retain a labeled previous plan; authentication errors clear it. Changing accounts
  hides the prior account's snapshot immediately, and requests are cancelled on exit.

No new services, paid features or schema migrations are required.

## Verification

`npm run test:week` covers owner isolation through the actual API handler,
bookmark/reminder deduplication, private response headers, excluded mail fields,
IST date boundaries, ongoing overnight rounds, overlap boundaries, unknown
durations and changed start times. It uses local PostgreSQL and fake Auth;
it sends no requests to external services and no emails.
