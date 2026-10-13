import { createClient, type User } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import { getDatabase, type Database } from "./db";
import { accountIdentities } from "./db/schema";
import { ProfileRequestError } from "./requestError";

export type VerifiedAccount = {
  uid: string;
  email?: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

// Only provider identities returned by the Auth server may recover an old account.
// Never trust editable metadata or a matching email address to claim legacy data.
export async function resolveAccountIdentity(user: User, db: Database): Promise<VerifiedAccount> {
  let uid = user.id;
  const identity = user.identities?.find((item) => item.provider === "google");
  const subject = identity?.identity_data?.sub;
  if (typeof subject === "string" && subject) {
    const [legacy] = await db.select({ userId: accountIdentities.userId })
      .from(accountIdentities)
      .where(and(eq(accountIdentities.provider, "google"), eq(accountIdentities.subject, subject)));
    if (legacy) uid = legacy.userId;
  }
  return {
    uid,
    email: user.email,
    email_verified: !!user.email_confirmed_at,
    name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : undefined,
    picture: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
  };
}

export async function verifyAccountToken(token: string): Promise<VerifiedAccount> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ProfileRequestError("Sign-in is not configured yet.", 503);
  const auth = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) {
    if (error && (!error.status || error.status >= 500))
      throw new ProfileRequestError("Sign-in service is unavailable. Try again shortly.", 503);
    throw new ProfileRequestError("Your session expired. Sign in again to continue.", 401);
  }
  return resolveAccountIdentity(data.user, getDatabase());
}
