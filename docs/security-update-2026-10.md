# Next.js security patch — 24 October 2026

Updated and locked the application to Next.js **16.4.3**, matching
`eslint-config-next` **16.4.3**, and React / React DOM **19.3.1**. This stays on the
existing framework release line and preserves the webpack production build and
Turbopack development commands. The lockfile records the new runtime and SWC
packages. No environment variables or deployment settings change.

The [official October advisory](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
identifies fixes available from Next.js 16.4.1 for upstream React Server Component
and image-processing vulnerabilities. The selected 16.4.3 patch is above that
minimum. The project's Sharp dependency already resolves to 0.35.5.

After installation, `npm audit --omit=dev` reports **zero known production
dependency vulnerabilities**. This is a dated registry check, not a guarantee
that future advisories will not appear. The full audit still reports advisories
in development tools and their dependencies (including legacy migration and UI
generation tooling). These are separate from the resolved Next.js advisory;
force-upgrading or downgrading the migration tooling is outside this patch.

Verify installed versions with `npm ls next react react-dom eslint-config-next
--depth=0`, then run lint, typecheck, the integration suites and `npm run build`.
Deploy the resulting commit to update the public Vercel application; changing
the local checkout does not patch an already-running deployment.
