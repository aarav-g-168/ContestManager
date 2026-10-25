# Encrypted application backup and recovery

The free-plan tool backs up **application PostgreSQL rows**. It is not a complete Supabase project backup: Auth identities/passwords/sessions, Vault/cron, provider configuration, Storage file bytes and hosting configuration are outside this archive. Supabase's database backups also do not include Storage object bytes; [official backup guidance](https://supabase.com/docs/guides/platform/backups) recommends free-tier users keep off-site exports.

## Create a backup

1. Generate a random 32-byte key using a password manager or local cryptographic tool. Store the 64-character hexadecimal value as `BACKUP_ENCRYPTION_KEY` in ignored `.env.local`. Keep an independent, secure copy; losing it makes backups unrecoverable. Never put it in Git or in the same off-site folder as archives.
2. Run `npm run db:backup`. It reads a repeatable, read-only snapshot and writes an AES-256-GCM authenticated archive under ignored `.backups/`. It never prints rows or credentials and refuses to overwrite an archive. A wrong key or modified ciphertext fails authentication.
3. Copy the archive to private off-site storage you already control. Run weekly for a small beta and before risky changes, monitor success, and retain at most 30 days. The command prunes only its own matching archives older than 30 days locally, after a successful backup; you must enforce the same maximum on off-site copies. No storage purchase or unattended cloud schedule is configured by this task.
4. Keep the exact Git commit/migrations with the archive date. Check the archive can be decrypted/restored to an isolated database. The offline launch suite exercises real encrypted round-trip/restore using sample data, not production records.

For uploaded photos, users can download their own photo in Settings. Operators needing full disaster recovery must separately back up private Storage objects with Supabase-supported tools and protect those copies. The application restore deliberately clears old photo paths and falls back to Google avatars rather than exposing stale/missing objects. Set up that separate object backup and an Auth recovery plan before claiming full project recovery.

## Restore safely

**Never point restore at production.** Use a separate, empty PostgreSQL database. No paid Supabase project is required for a local recovery drill.

1. Stop application writes and recovery jobs in the affected environment. Record and reconcile existing Resend scheduled emails in the provider dashboard. Restoring a database cannot cancel an email already scheduled outside it.
2. Take a current safety backup if the source is reachable. Preserve secure evidence of account deletions after the chosen archive date. Completed in-app deletion receipts intentionally scrub owner identifiers; maintain a restricted deletion-exclusion ledger for the backup retention window, or use a newer clean backup. Do not restore users who asked to be erased.
3. Apply this project's migrations to the **empty target**. Configure its DATABASE_URL in a separate local environment and verify the target host. `db:migrate` uses DIRECT_DATABASE_URL; keep both pointing at the intended target for this step.
4. Create an ignored JSON file listing stable application user IDs to exclude, e.g. `.backups/deleted-user-ids.json`. Use `[]` only after confirming no deletion exclusions are required. This is mandatory to avoid accidental resurrection of deleted data.
5. Run:

   ```sh
   npm run db:restore -- .backups/ARCHIVE.cmbackup --confirm-empty-target --exclude-users .backups/deleted-user-ids.json
   ```

6. The restore locks the application tables, refuses any populated target and inserts in one transaction. It never deletes or overwrites existing rows. Accounts marked deleting in the archive and explicitly excluded owners are omitted, along with dependent rows. Old reminder mappings/deletion jobs are omitted, pending/scheduled/uncertain delivery snapshots become cancelled, provider payloads/leases are cleared, saved preferences are paused, and uploaded photo paths are cleared. No emails are sent. Missing preferences still have no active mappings/jobs to rearm.
7. Verify owner isolation, profile/journal counts, exclusions and no active outbox jobs. Auth recovery and external identity mapping need a separate reviewed plan when moving to a new Supabase project; app rows alone do not recreate login identities. Reconfigure private bucket, Google provider, webhook and cron credentials manually. Never blindly execute archived deletion jobs against a different Auth project.
8. Reconcile external mail again before serving traffic. Users must deliberately create new reminders. Keep jobs disabled until the target is verified. Review restored nonterminal/failed history; restoring it does not validate recipient delivery.

Operational request counters, worker telemetry and alert cooldowns are intentionally not restored. An encrypted archive may contain email content and personal notes; treat it as private even though encrypted. Do not attach it to GitHub issues or public artifacts.
