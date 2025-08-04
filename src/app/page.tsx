// app/page.tsx (for Next.js App Router with TypeScript)

import React from 'react';
import ContestClientComponent from '@/ContestClientComponent';

// --- Type Definitions ---
interface Contest {
  id: number;
  event: string;
  host: string;
  href: string;
  start: string; // ISO 8601 date string
  duration: number; // in seconds
}

interface GetContestsResponse {
  contests?: Contest[];
  error?: string;
}

// --- API Key Configuration ---
// To use this app, add your CLIST API key to your .env.local file:
// NEXT_PUBLIC_CLIST_API_KEY=your_username:your_api_key
const API_KEY = process.env.NEXT_PUBLIC_CLIST_API_KEY;

// --- Data Fetching Function ---
async function getContests(): Promise<GetContestsResponse> {
  if (!API_KEY) {
    console.error("CLIST API key is missing. Please add NEXT_PUBLIC_CLIST_API_KEY to your .env.local file.");
    return { error: "API Key is not configured on the server." };
  }

  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const API_URL = `https://clist.by/api/v4/contest/?start__gte=${now}&start__lte=${future}&order_by=start`;

  try {
    // We use { cache: 'no-store' } to ensure we get fresh data on every request.
    // For production, you might want a revalidation strategy like { next: { revalidate: 3600 } }
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `ApiKey ${API_KEY}`,
      },
      cache: 'no-store', 
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}. The API key might be invalid.`);
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

// --- Page Component (Server Component) ---
export default async function HomePage() {
  const { contests, error } = await getContests();

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-2">Upcoming Coding Contests</h1>
          <p className="text-lg text-gray-600">Your one-stop dashboard for competitive programming events.</p>
        </header>

        {error ? (
          <div className="text-center bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        ) : (
          <ContestClientComponent initialContests={contests || []} />
        )}

        <footer className="text-center mt-12 text-gray-500">
            <p>Made with ❤️ by <a href="https://clist.by/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Aarav!</a></p>
        </footer>
      </div>
    </div>
  );
}