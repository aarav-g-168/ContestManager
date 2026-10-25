import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export const BACKUP_TABLES = [
  "users",
  "contests",
  "account_identities",
  "account_preferences",
  "bookmarks",
  "reminder_deliveries",
  "reminders",
  "mail_events",
  "journal_entries",
  "weekly_goals",
  "feedback_messages",
  "teams",
  "team_members",
  "contest_results",
  "account_deletions",
] as const;
export type Backup = {
  version: 1;
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};
function key(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.",
    );
  return Buffer.from(value, "hex");
}
export function encryptBackup(data: Backup, secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from("contest-manager-backup-v1"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return Buffer.from(
    JSON.stringify({
      version: 1,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: encrypted.toString("base64"),
    }),
  );
}
export function decryptBackup(bytes: Buffer, secret: string): Backup {
  const raw = JSON.parse(bytes.toString("utf8"));
  if (raw.version !== 1) throw new Error("Unsupported backup.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(secret),
    Buffer.from(raw.iv, "base64"),
  );
  decipher.setAAD(Buffer.from("contest-manager-backup-v1"));
  decipher.setAuthTag(Buffer.from(raw.tag, "base64"));
  const value = JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(raw.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  );
  if (
    value.version !== 1 ||
    !value.tables ||
    !Number.isFinite(Date.parse(value.createdAt))
  )
    throw new Error("Invalid backup format.");
  for (const table of Object.keys(value.tables)) {
    if (
      !BACKUP_TABLES.includes(table as never) ||
      !Array.isArray(value.tables[table])
    )
      throw new Error("Unexpected backup table.");
  }
  return value;
}
export function restoreRows(backup: Backup, excluded: string[]) {
  const blocked = new Set([
    ...excluded,
    ...(backup.tables.users ?? [])
      .filter((row) => row.account_state === "deleting")
      .map((row) => String(row.id)),
  ]);
  const tables: Backup["tables"] = {};
  for (const table of BACKUP_TABLES) {
    if (["account_deletions", "reminders"].includes(table)) {
      tables[table] = [];
      continue;
    }
    tables[table] = (backup.tables[table] ?? [])
      .filter(
        (row) =>
          !blocked.has(
            String(
              table === "users" ? row.id : (row.user_id ?? row.owner_id ?? ""),
            ),
          ),
      )
      .map((row) =>
        table === "reminder_deliveries"
          ? {
              ...row,
              status: ["pending", "scheduled", "uncertain"].includes(
                String(row.status),
              )
                ? "cancelled"
                : row.status,
              cancel_requested: false,
              lease_token: null,
              lease_until: null,
              provider_payload: null,
            }
          : table === "account_preferences"
            ? { ...row, reminders_paused: true }
            : table === "users"
              ? { ...row, photo_path: null, avatar_mode: "google" }
              : row,
      );
  }
  const teams = new Set(tables.teams.map((row) => row.id));
  tables.team_members = tables.team_members.filter((row) =>
    teams.has(row.team_id),
  );
  const providers = new Set(
    tables.reminder_deliveries.map((row) => row.provider_id),
  );
  tables.mail_events = tables.mail_events.filter((row) =>
    providers.has(row.provider_id),
  );
  return tables;
}

export async function restoreDatabase(
  db: import("../../src/lib/db").Database,
  backup: Backup,
  exclusions: string[],
) {
  const { sql } = await import("drizzle-orm");
  const rows = restoreRows(backup, exclusions);
  await db.transaction(async (tx) => {
    for (const table of BACKUP_TABLES) {
      await tx.execute(
        sql.raw(`lock table public."${table}" in access exclusive mode`),
      );
      const result = await tx.execute(
        sql.raw(`select count(*)::int as count from public."${table}"`),
      );
      if (Number(result.rows[0].count) !== 0)
        throw new Error("Target is not empty");
    }
    for (const table of BACKUP_TABLES) {
      for (const row of rows[table]) {
        const columns = Object.keys(row);
        if (columns.some((column) => !/^[a-z_]+$/.test(column)))
          throw new Error("Invalid column");
        const values = columns.map(
          (column) =>
            sql`${row[column] !== null && typeof row[column] === "object" ? JSON.stringify(row[column]) : row[column]}`,
        );
        await tx.execute(
          sql`insert into ${sql.raw(`public."${table}"`)} (${sql.join(
            columns.map((column) => sql.raw(`"${column}"`)),
            sql`, `,
          )}) values (${sql.join(values, sql`, `)})`,
        );
      }
    }
  });
}
