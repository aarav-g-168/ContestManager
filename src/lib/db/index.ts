import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

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
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  cache.contestPool = pool;
  cache.contestDatabase = drizzle(pool, { schema });
  return cache.contestDatabase;
}
