import type { VerifiedAccount } from "@/features/auth/server/auth";
import { ProfileRequestError } from "@/lib/http/request-error";

export function requireAdmin(
  account: VerifiedAccount,
  allowlist = process.env.ADMIN_AUTH_USER_IDS || "",
) {
  const ids = allowlist
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!account.email_verified || !ids.includes(account.authId))
    throw new ProfileRequestError(
      "You do not have access to the admin dashboard.",
      403,
    );
}
