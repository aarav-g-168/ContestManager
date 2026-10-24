import type { Metadata } from "next";
import ContestJournal from "@/features/journal/components/ContestJournal";
import { journalQuery } from "@/features/journal/lib/journal";
import { practiceQuery } from "@/features/journal/lib/practice";
import PracticeQueue from "@/features/journal/components/PracticeQueue";
export const metadata: Metadata = {
  title: "Contest journal",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    if (typeof value === "string") params.set(key, value);
  if (params.get("view") === "practice") {
    let practice;
    try {
      practice = practiceQuery(params);
    } catch {
      practice = practiceQuery(new URLSearchParams());
    }
    return (
      <PracticeQueue
        key={JSON.stringify(practice)}
        initialQuery={practice}
        initialNow={new Date().getTime()}
      />
    );
  }
  let query;
  try {
    query = journalQuery(params);
  } catch {
    query = journalQuery(new URLSearchParams());
  }
  const { host, ...rest } = query;
  const initialFilters = { ...rest, platform: host };
  const initialNow = new Date().getTime();
  return (
    <ContestJournal
      key={JSON.stringify(initialFilters)}
      initialNow={initialNow}
      initialFilters={initialFilters}
    />
  );
}
