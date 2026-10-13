import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({ path: ".env.local" });
const migrationUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";
if (migrationUrl && new URL(migrationUrl).hostname.endsWith(".neon.tech"))
  throw new Error("Configure your Supabase PostgreSQL URL before migrating");
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
});
