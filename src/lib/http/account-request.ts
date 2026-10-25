import { verifyAccountToken } from "@/features/auth/server/auth";
import { NextResponse } from "next/server";
import { ProfileRequestError } from "@/lib/http/request-error";
import { getDatabase } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { takeRequestLimit } from "@/lib/security/rate-limit";
export { ProfileRequestError } from "@/lib/http/request-error";
export async function authenticateProfile(
  request: Request,
  options: { allowDeleting?: boolean } = {},
) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    throw new ProfileRequestError("Sign in to manage your account.", 401);
  const account = await verifyAccountToken(token),
    db = getDatabase();
  const [row] = await db
    .select({ state: users.accountState })
    .from(users)
    .where(eq(users.id, account.uid));
  if (row?.state === "deleting" && !options.allowDeleting)
    throw new ProfileRequestError(
      "Account deletion is in progress. Open Account settings to check its status.",
      423,
    );
  const read = ["GET", "HEAD"].includes(request.method);
  await takeRequestLimit(
    db,
    account.uid,
    read ? "read" : "write",
    read ? 240 : 60,
    60,
  );
  return account;
}

export function profileErrorResponse(error: unknown) {
  if (error instanceof ProfileRequestError)
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store", ...error.headers },
      },
    );
  console.error(
    "Profile service failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "Your account data is unavailable. Please try again shortly." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
