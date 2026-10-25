import { config } from "dotenv";
import { mkdir, writeFile, readdir, stat, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { sql } from "drizzle-orm";
import { getDatabase } from "../../src/lib/db";
import { BACKUP_TABLES, encryptBackup, type Backup } from "./backup-core.mts";
config({ path: ".env.local", quiet: true });
try {
  const secret = process.env.BACKUP_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(secret))
    throw new Error(
      "Configure a 64-hex-character BACKUP_ENCRYPTION_KEY first.",
    );
  const folder = resolve(".backups"),
    path = resolve(
      folder,
      `contest-manager-${new Date().toISOString().replace(/[:.]/g, "-")}.cmbackup`,
    );
  const tables = await getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`set transaction isolation level repeatable read, read only`,
    );
    const rows: Backup["tables"] = {};
    for (const table of BACKUP_TABLES) {
      const result = await tx.execute(
        sql.raw(`select * from public."${table}"`),
      );
      rows[table] = result.rows as Record<string, unknown>[];
    }
    return rows;
  });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    encryptBackup(
      { version: 1, createdAt: new Date().toISOString(), tables },
      secret,
    ),
    { flag: "wx", mode: 0o600 },
  );
  for (const name of await readdir(folder)) {
    if (!/^contest-manager-[\dTZ.-]+\.cmbackup$/.test(name)) continue;
    const candidate = resolve(folder, name);
    if (dirname(candidate) !== folder) continue;
    if ((await stat(candidate)).mtimeMs < Date.now() - 30 * 86400000)
      await unlink(candidate);
  }
  console.log(
    "Encrypted application database backup saved under .backups/. Copy it to secure off-site storage; photo files and Supabase Auth are not included.",
  );
  process.exit(0);
} catch {
  console.error(
    "Backup failed. Check configuration, key and database access; no credentials are printed.",
  );
  process.exit(1);
}
