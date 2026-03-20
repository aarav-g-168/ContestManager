import ContestClientComponent from "@/src/components/ContestClientComponent";
import { getHomePageContests } from "@/src/lib/contestUtils";
import type { Contest } from "../types/contest";
import { parseAsUTC } from "@/src/lib/date";

export const dynamic = "force-dynamic";

// ✅ FIXED: remove NEXT_PUBLIC
const API_KEY = process.env.CLIST_API_KEY;

async function getContests(): Promise<Contest[]> {
  if (!API_KEY) {
    throw new Error("API Key is not configured*/");
  }

  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const API_URL = `https://clist.by/api/v4/contest/?start__gte=${now}&start__lte=${future}&order_by=start`;

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

export default async function HomePage() {
  let contests: Contest[] = [];

  try {
    contests = await getContests();
  } catch (error) {
    return (
      <div className="text-center text-red-600 p-10">
        <h2 className="text-xl font-bold">/*Failed to load contests</h2>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  const filteredContests = getHomePageContests(contests);

  const contestsWithFormattedStart = filteredContests.map((c: Contest) => ({
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
            Upcoming Coding Contests
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Your one-stop dashboard for competitive programming events.
          </p>
        </header>

        <ContestClientComponent
          initialContests={contestsWithFormattedStart}
          // ❗ no showFilters → homepage stays clean
        />

        <div className="flex justify-end mb-6 mt-4">
          <a
            href="/contests"
            className="group text-black font-semibold flex items-center gap-1"
          >
            View All Upcoming Contests
            <span className="transform transition-transform group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>

        <footer className="text-center mt-12 text-gray-500">
          <p>
            Made with ❤️ by{" "}
            <a
              href="https://aaravgupta.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline mt-1 inline-block"
            >
              Aarav!!
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}