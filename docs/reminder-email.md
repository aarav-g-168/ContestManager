# Reminder email layout

`features/reminders/server/email.ts` builds the subject, plain text and validated
links. `email-template.ts` renders escaped HTML with inline styles and
presentation tables. No new email library, service, asset or database field is
required. Scheduling, retries, cancellation, webhooks and idempotency stay on the
existing delivery path.

The email uses a centered, fluid card capped at 600 px, a soft background,
explicit body text sizes, platform/contest details, a full date including year,
and a prominent orange Open contest button. Start times remain IST with
UTC+5:30 shown. The selected reminder interval describes the saved preference,
not a live countdown or a promise about inbox delivery timing.

Below 620 px, the date/time columns stack, padding reduces and the main button
expands to the available width. Text wraps inside fixed-layout detail tables,
including unusually long contest names. Inline baseline styles remain readable
if an email client removes the responsive style block. Outlook's Word renderer
gets a conditional 600 px wrapper; unsupported rounded corners may appear square.
No scripts, remote images, custom web fonts or tracking assets are added.

The CSS uses [Gmail-supported selectors and width media queries](https://developers.google.com/workspace/gmail/design/css).
Browser previews verify layout, not every email client's rendering or forced
dark-mode behavior. An actual Gmail/Outlook inbox test is still a separate check;
development previews and tests do not send emails.

My week and Manage reminders link to `/week` and `/reminders` on the HTTPS
`APP_URL` origin. Invalid/missing or credential-bearing configuration falls back
to `https://contest-manager.vercel.app`. Contest URLs require HTTPS without
embedded credentials. The smaller founder sign-off links to `https://aarav.site`.
The plain-text alternative includes the same useful details and destinations.

After deployment, newly claimed delivery jobs use the new template. Jobs whose
provider payload was already frozen (including emails already scheduled with
Resend) retain that original HTML. Do not rewrite those payloads: the exact
request must stay unchanged across provider idempotency retries. No existing
scheduled messages are cancelled or resent by this design change.

Run `npm run test:email` for escaping, safe destinations, IST/year boundaries,
plain text, private-field exclusion and immutable provider payload checks; run
`npm run test:backend` for queue and REST adapter behavior. Both use fake provider
responses and send no real messages. Also run lint, typecheck and a production
build before deployment.
