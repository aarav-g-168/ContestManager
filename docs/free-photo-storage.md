# Free profile photo storage

Keep Firebase on Spark for Authentication. Neon stores application data;
Supabase is used only for private photo files. No Firebase Blaze upgrade is needed.

1. Sign up at https://supabase.com/dashboard and create an organization on **Free**.
   Do not upgrade or enable paid add-ons. No payment card is needed for Free.
2. Create a project named `contest-manager-photos`. Save its database password
   privately (this app does not use that database). Choose a nearby region.
3. Open Storage and create a bucket named `profile-photos`. Keep **Public off**.
   Set allowed MIME types to `image/webp` and a file-size limit of 192 KB.
   Do not add anonymous/client storage policies: only the server accesses files.
4. Copy the project URL and server **secret** API key from the project's Connect
   dialog/settings. A legacy `service_role` key is also supported. Never use the
   publishable/anon key for this integration, expose the secret to the browser,
   or paste it into chat.
5. Add these to `.env.local` and the deployment's server environment:

   ```env
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   SUPABASE_PHOTO_BUCKET=profile-photos
   ```

6. Restart the local server and run `npm run check:services`. It verifies that
   the bucket is reachable and private without uploading or sending anything.
7. After migration/deployment, verify photo upload, replacement, removal and
   access isolation while signed in. Existing Firestore photos are copied by
   `npm run db:import-firestore -- --apply`; do not run it before the final
   backup and old-writer shutdown described in `stack-migration.md`.

The current Free plan includes 1 GB file storage and 5 GB uncached egress.
Free projects may pause after one week of inactivity. Quota limits or pauses
can interrupt photos; they are not a promise of unlimited service. Stay on Free
and do not attach paid upgrades. Review current terms before accepting changes:
https://supabase.com/pricing and
https://supabase.com/docs/guides/platform/billing-on-supabase.
