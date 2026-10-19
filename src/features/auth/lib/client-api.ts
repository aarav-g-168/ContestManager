import type { AccountUser } from "@/features/auth/lib/user";

export async function accountRequest<T>(
  user: AccountUser,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${await user.getAccessToken()}`,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request failed. Please try again.");
  return data as T;
}
