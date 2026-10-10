import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import ContestClientComponent from "@/components/ContestClientComponent";
import PageHeading from "@/components/PageHeading";
import FeedError from "@/components/FeedError";
import { getContestFeed } from "@/lib/contestFeed";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore contests" };
export default async function ContestsPage() {
  const { contests, error } = await getContestFeed();
  return (
    <div className="site-container pb-7">
      <PageHeading
        eyebrow="Calendar"
        title="Upcoming contests"
        description="Search by name or platform, filter by date, and save the contests you want to enter."
      >
        <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
          <Clock3 size={13} aria-hidden="true" />
          Times in IST (UTC+5:30)
        </span>
      </PageHeading>
      {error ? (
        <FeedError message={error} />
      ) : (
        <ContestClientComponent initialContests={contests} showFilters />
      )}
      <p className="mt-8 text-center font-mono text-[10px] leading-6 text-muted-foreground">
        Contest data from CLIST · Looking ahead 30 days · Schedules may change
      </p>
    </div>
  );
}
