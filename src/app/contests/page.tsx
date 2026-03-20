import ContestClientComponent from "@/src/components/ContestClientComponent";
import type { Contest } from "../../types/contest";
import { parseAsUTC } from "@/src/lib/date";

export const dynamic = "force-dynamic";

// ✅ Secure API key (NOT exposed to client)
const API_KEY = process.env.CLIST_API_KEY;

async function getContests(): Promise<Contest[]> {
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

export default async function ContestsPage() {
  let contests: Contest[] = [];

  try {
    contests = await getContests();
  } catch (error) {
    return (
      <div className="text-center text-red-600 p-10">
        <h2 className="text-xl font-bold">Failed to load contests</h2>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  const contestsWithFormattedStart = contests.map((c: Contest) => ({
    ...c,
    formattedStartIST:
      parseAsUTC(c.start).toLocaleString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }) + " (IST)",
  }));

  return (
    <div className="bg-gray-300 min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">

        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-3 mt-7">
            All Upcoming Contests
          </h1>
        </header>

        <ContestClientComponent
          initialContests={contestsWithFormattedStart}
          showFilters={true}
        />

      </div>
    </div>
  );
}