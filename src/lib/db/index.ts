import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { runtimeDatabaseUrl } from "./connection";

export type Database = NodePgDatabase<typeof schema>;
const cache = globalThis as typeof globalThis & {
  contestDatabase?: Database;
  contestPool?: Pool;
};
export function getDatabase(): Database {
  if (cache.contestDatabase) return cache.contestDatabase;
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  const pool = new Pool({
    connectionString: runtimeDatabaseUrl(process.env.DATABASE_URL),
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    maxLifetimeSeconds: 60,
  });
  // pg removes the failed idle client; handling the event prevents an idle
  // network disconnect from becoming an uncaught process error. Never log URLs.
  pool.on("error", () => console.error("Database idle connection closed"));
  cache.contestPool = pool;
  cache.contestDatabase = drizzle(pool, { schema });
  return cache.contestDatabase;
}
