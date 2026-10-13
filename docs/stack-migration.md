# Stack migration

The current rollout uses one Supabase Free project for PostgreSQL, Google login,
private photos and reminder recovery. Follow [Supabase setup and cutover](supabase-setup.md).

The previous Neon/Firebase runtime configuration is retired. Existing source data
and ignored legacy credentials are preserved until the migration is verified.
Resend, CLIST, Cloudflare and Next.js hosting remain part of the application.
