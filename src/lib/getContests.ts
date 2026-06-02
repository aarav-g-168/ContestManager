import type { Contest } from "@/types/contest";

const API_KEY = process.env.CLIST_API_KEY;

export async function getContests(): Promise<Contest[]> {
  if (!API_KEY) {
    throw new Error("API Key is not configured");
  }

  const now = new Date().toISOString();
  const future = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const API_URL =
    `https://clist.by/api/v4/contest/?start__gte=${now}&start__lte=${future}&order_by=start`;

  const response = await fetch(API_URL, {
    headers: {
      Authorization: `ApiKey ${API_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CLIST API error: ${response.status}`);
  }

  const data = await response.json();

  return data.objects;
}