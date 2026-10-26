import type { Contest } from "@/features/contests/types";
import { parseAsUTC } from "@/lib/date";

// Upcoming discovery cannot supply rounds that have already started. Keep a
// separate, shared recent feed so journaling does not require a prior bookmark.
export async function getRecentContests(): Promise<Contest[]> {
  const apiKey = process.env.CLIST_API_KEY;
  if (!apiKey) throw new Error("Contest provider is not configured");
  const now = Date.now();
  const windowEnd = Math.ceil(now / 1800000) * 1800000;
  const params = new URLSearchParams({
    start__gte: new Date(windowEnd - 30 * 86400000).toISOString(),
    start__lte: new Date(windowEnd).toISOString(),
    order_by: "-start",
    limit: "500",
  });
  const response = await fetch(`https://clist.by/api/v4/contest/?${params}`, {
    headers: { Authorization: `ApiKey ${apiKey}` },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Contest provider: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.objects)) throw new Error("Invalid recent contest feed");
  return data.objects.filter((contest: Contest) => {
    try {
      const start = parseAsUTC(contest.start).getTime();
      const url = new URL(contest.href);
      return Number.isSafeInteger(contest.id) && contest.id > 0 &&
        typeof contest.event === "string" && contest.event.length > 0 &&
        typeof contest.host === "string" && contest.host.length > 0 &&
        Number.isInteger(contest.duration) && contest.duration >= 0 &&
        start <= now && start >= now - 30 * 86400000 &&
        url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  });
}
