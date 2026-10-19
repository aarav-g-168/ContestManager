import { unstable_cache } from "next/cache";
import type { Contest } from "@/features/contests/types";
import { parseAsUTC } from "@/lib/date";

// Share a successful feed across pages instead of spending a CLIST request
// on every navigation. Failed requests are thrown, never cached as empty data.
const getCachedContests = unstable_cache(
  async (): Promise<Contest[]> => {
    const apiKey = process.env.CLIST_API_KEY;
    if (!apiKey) throw new Error("API Key is not configured");
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    const response = await fetch(
      `https://clist.by/api/v4/contest/?start__gte=${now}&start__lte=${future}&order_by=start`,
      {
        headers: { Authorization: `ApiKey ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error(`CLIST API error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.objects)) throw new Error("Invalid contest feed");
    return data.objects;
  },
  ["clist-upcoming-contests"],
  { revalidate: 1800 },
);

export async function getContests(): Promise<Contest[]> {
  const contests = await getCachedContests();
  return contests.filter(
    (contest) => parseAsUTC(contest.start).getTime() > Date.now(),
  );
}
