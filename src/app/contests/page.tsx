import type { Metadata } from "next";
import { ArrowUpRight, Clock3 } from "lucide-react";
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
        eyebrow="Find your starting line"
        title="The contest calendar"
        description="Big challenges. Fresh problems. Explore upcoming contests across the platforms you love."
      >
        <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
          <Clock3 size={13} aria-hidden="true" />
          ALL TIMES IN IST <ArrowUpRight size={12} aria-hidden="true" />
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
