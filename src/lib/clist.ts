import { Contest } from "../types/contest";

const CLIST_API = "https://clist.by/api/v4/contest/";

export async function fetchContests(): Promise<Contest[]> {
  const username = process.env.CLIST_USERNAME;
  const apiKey = process.env.CLIST_API_KEY;

  const res = await fetch(
    `${CLIST_API}?username=${username}&api_key=${apiKey}&limit=100`,
    {
      next: { revalidate: 1800 }, // will store cached data for 30 minutes....only hits the API once per 30 minutes
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch contests");
  }

  const data = await res.json();

  return data.objects;
}