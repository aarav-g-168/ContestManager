# Launch readiness

Implementation scope approved by the owner: account export/deletion, journal
deletion, reminder preferences, support/privacy/terms, first-use guidance,
abuse protection, failure monitoring, backup/restore tooling, CI, public SEO and
release checks. New reminder choices are 15 minutes, 1 hour and 3 hours; already
scheduled 6/24-hour reminders keep their saved timing.

## Implementation checklist

- [x] Shared reminder timing rules, new choices and legacy display compatibility.
- [x] Private account settings, default reminder and pause-all controls.
- [x] Owner-scoped JSON/CSV export and durable, confirmed account deletion.
- [x] Journal deletion with confirmation and revision protection.
- [x] Private feedback form, administrator inbox and public contact details.
- [x] Accurate privacy information and product terms.
- [x] First-use checklist without another navbar item.
- [x] Database-backed request throttling and account resource limits.
- [x] Health endpoint, failure checks and operational alert setup.
- [x] Encrypted backup and empty-database restore tooling with a recovery guide.
- [x] Pull-request CI and browser regression test definitions.
- [x] Sitemap, robots rules, share image and metadata polish.
- [x] Integration tests, build, responsive/accessibility checks and documentation.

## Deployment and human acceptance

Deployment, real Google sign-in, a real reminder send/cancellation and actual
Gmail/Outlook inbox checks must be recorded separately from local tests. No
automated test should send a live email or delete a real account. Configure
GitHub notifications/monitoring credentials and a secure backup destination as
documented before calling the public launch complete. Preserve free-plan usage
limits and do not enable paid services.

## Verified locally

- `npm run lint` (includes structure), `npm run typecheck`, all eleven offline suites and `npm run build` passed.
- Production dependency audit: zero known vulnerabilities. The existing ten development-tool advisories remain documented separately; no force upgrade was applied.
- `0005_launch_controls` applied successfully to the configured Supabase project; no user data removed.
- CUA checks at 375, 768 and 1440 pixels: support/settings gates/privacy, both themes, no horizontal overflow; sample preference save/failure, feedback success and journal confirmation/deletion. Radix modal closure restores pointer events.
- Eight browser regression definitions were discovered successfully. Their runner has **not** been executed locally; GitHub CI is configured to run them after push.
- Encryption/empty-database restore were tested with disposable PostgreSQL fixtures, not production backups. The tool covers application rows; complete Auth/Storage recovery needs separate setup.

## Still required from the owner

- [ ] Push/deploy this commit and verify Vercel built it.
- [ ] Add optional alert recipient / GitHub monitor secret and enable failed-workflow notifications.
- [ ] Configure a private backup key, off-site copy/schedule, retention and separate Auth/Storage recovery.
- [ ] Review public Privacy/Terms and support address before launch.
- [ ] Real Google OAuth, real reminder create/cancel and Gmail/Outlook checks on the new deployment.
- [ ] Account deletion acceptance using a deliberately disposable account.

Implementation completion does not mean those production acceptance steps have happened. No live emails or real account deletions were performed by automated tests.
