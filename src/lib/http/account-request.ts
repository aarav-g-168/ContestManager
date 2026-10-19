import { verifyAccountToken } from "@/features/auth/server/auth";
import { NextResponse } from "next/server";
import { ProfileRequestError } from "@/lib/http/request-error";
export { ProfileRequestError } from "@/lib/http/request-error";
export async function authenticateProfile(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    throw new ProfileRequestError("Sign in to manage your account.", 401);
  return verifyAccountToken(token);
}

export function profileErrorResponse(error: unknown) {
  if (error instanceof ProfileRequestError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
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
