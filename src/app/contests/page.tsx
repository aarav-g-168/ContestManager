import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import ContestClientComponent from "@/components/ContestClientComponent";
import PageHeading from "@/components/PageHeading";
import FeedError from "@/components/FeedError";
import { getContestFeed } from "@/lib/contestFeed";
import { getContestDay } from "@/lib/contestCalendar";
import { getPlatformKey } from "@/lib/platforms";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore contests" };
export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; date?: string }>;
}) {
  const { contests, error } = await getContestFeed();
  const params = await searchParams;
  const platform =
    typeof params.platform === "string" &&
    contests.some((contest) => getPlatformKey(contest.host) === params.platform)
      ? params.platform
      : "";
  const date =
    typeof params.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.date) &&
    contests.some((contest) => getContestDay(contest.start) === params.date)
      ? params.date
      : "";
  return (
    <div className="site-container contests-page pb-7">
      <PageHeading
        eyebrow="Calendar"
        title="Upcoming contests"
        description="Browse by day or platform, compare start times, and save a round for later."
      >
        <span className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
          <Clock3 size={13} aria-hidden="true" />
          Times in IST (UTC+5:30)
        </span>
      </PageHeading>
      {error ? (
        <FeedError message={error} />
      ) : (
        <ContestClientComponent
          key={`${platform}-${date}`}
          initialContests={contests}
          showFilters
          today={getContestDay(new Date())}
          initialPlatform={platform}
          initialDate={date}
        />
      )}
      <p className="mt-8 text-center font-mono text-[10px] leading-6 text-muted-foreground">
        Contest data from CLIST · Looking ahead 30 days · Schedules may change
      </p>
    </div>
  );
}
