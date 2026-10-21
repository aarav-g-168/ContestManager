# Loading states

Every current page has a deliberate `loading.tsx`: homepage, contests, bookmarks,
reminders, profile, My week, journal, progress and admin. Each fallback uses a
feature-owned skeleton that matches the page’s main layout. Route fallbacks are
separate from the data controllers, so loading them does not initialize an extra
copy of an authenticated data hook.

The same components cover initial browser data/session loading. Admin uses its
dashboard skeleton while verifying the session and fetching the first authorized
overview. A denied request still renders the access-denied state; skeletons
contain no account data or fake statistics.

Saved contest/reminder lists include filter placeholders while account data
loads. Public contest cards remain readable, with placeholders for saved actions
until their account state is ready. Profile activity counts use small skeletons
while waiting for their requests. Journal filter requests use an entry skeleton.

Week, Progress and Admin retain their loaded snapshot and refresh feedback during
background requests. Local instant filters do not invent a loading delay. Save,
upload and reminder mutations retain disabled controls, spinners and error
feedback. Failures and empty results render their real states rather than an
endless placeholder. Fast or prefetched navigation may finish without showing a
skeleton.

`src/components/feedback/LoadingSkeleton.tsx` supplies decorative blocks, headings
and a named loading status with busy/live-region semantics. Shapes are hidden from
assistive technology and contain no focusable controls. Existing theme tokens
provide light/dark colors; reduced-motion preferences disable the skeleton pulse.

For new pages, add a route fallback and a feature skeleton, then reuse it in the
initial client fetch branch. Keep placeholders out of successful loaded content.
`npm run test:loading` renders all route fallbacks, checks loading semantics,
checks every page directory has a fallback, and verifies saved actions do not
appear as unsaved before their data arrives. It uses no live services.
