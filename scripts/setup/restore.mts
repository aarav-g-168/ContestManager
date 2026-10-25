import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { getDatabase } from "../../src/lib/db";
import { decryptBackup, restoreDatabase } from "./backup-core.mts";
config({ path: ".env.local", quiet: true });
const args = process.argv.slice(2);
if (
  args.length !== 4 ||
  args[1] !== "--confirm-empty-target" ||
  args[2] !== "--exclude-users"
) {
  console.error(
    "Usage: npm run db:restore -- BACKUP_FILE --confirm-empty-target --exclude-users DELETED_USER_IDS_JSON_FILE",
  );
  process.exit(1);
}
try {
  const exclusions = JSON.parse(await readFile(args[3], "utf8"));
  if (
    !Array.isArray(exclusions) ||
    exclusions.some((value) => typeof value !== "string")
  )
    throw new Error("Invalid exclusions");
  const backup = decryptBackup(
    await readFile(args[0]),
    process.env.BACKUP_ENCRYPTION_KEY ?? "",
  );
  await restoreDatabase(getDatabase(), backup, exclusions);
  console.log(
    "Application rows restored to an empty database. Reminders remain disabled; photos/Auth need separate recovery. Reconcile Resend schedules and deletion exclusions BEFORE serving traffic.",
  );
  process.exit(0);
} catch {
  console.error(
    "Restore refused or failed. No existing rows are overwritten. Check the empty target, migrations, exclusions and encryption key.",
  );
  process.exit(1);
}
