import ContestClientComponent from "@/src/app/ContestClientComponent";
import { getHomePageContests } from "./lib/contestFilter";
import type { Contest } from "./types/contest";
import { parseAsUTC } from "./lib/date";

export const dynamic = "force-dynamic";

interface GetContestsResponse {
  contests?: Contest[];
  error?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_CLIST_API_KEY;

async function getContests(): Promise<GetContestsResponse> {
  if (!API_KEY) {
    console.error(
      "CLIST API key is missing. Please add NEXT_PUBLIC_CLIST_API_KEY to your .env.local file."
    );
    return { error: "API Key is not configured on the server." };
  }

  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const API_URL = `https://clist.by/api/v4/contest/?start__gte=${now}&start__lte=${future}&order_by=start`;

  try {
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `ApiKey ${API_KEY}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status}. The API key might be invalid.`
      );
    }

    const data = await response.json();

    return { contests: data.objects };
  } catch (err: unknown) {
    console.error("Fetch error:", err);

    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Unknown error" };
    }
  }
}

export default async function HomePage() {
  const { contests, error } = await getContests();

  const filteredContests = contests
    ? getHomePageContests(contests)
    : [];

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
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-3 mt-7">
            Upcoming Coding Contests
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Your one-stop dashboard for competitive programming events.
          </p>
        </header>

        {error ? (
          <div
            className="text-center bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg"
            role="alert"
          >
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        ) : (
          <ContestClientComponent
            initialContests={contestsWithFormattedStart}
          />
        )}

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
            Made with ❤️ by {""}
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