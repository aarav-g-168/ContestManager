// Vercel instances must share backend connections rather than reserve a session
// each. Migrations use DIRECT_DATABASE_URL separately in drizzle.config.ts.
export function runtimeDatabaseUrl(value: string): string {
  const url = new URL(value);
  if (url.hostname.endsWith(".neon.tech"))
    throw new Error("Replace the retired Neon URL with your Supabase PostgreSQL URL");
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
    url.port = "6543";
    return url.toString();
  }
  return value;
}
