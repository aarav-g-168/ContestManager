import type { User } from "@supabase/supabase-js";

export type AccountUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getAccessToken: () => Promise<string>;
};

export function accountUser(user: User, getAccessToken: () => Promise<string>): AccountUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
    photoURL: typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    getAccessToken,
  };
}
