import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroSection, { ProductFeatures } from "@/components/hero";
import ContestClientComponent from "@/components/ContestClientComponent";
import FeedError from "@/components/FeedError";
import { getContestFeed } from "@/lib/contestFeed";
import { filterContestsByDays, sortContests } from "@/lib/contestUtils";
import { getContestDay } from "@/lib/contestCalendar";
import { getPlatformKey } from "@/lib/platforms";
import ExplorePlatforms from "@/components/ExplorePlatforms";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const { contests, error } = await getContestFeed();
  const seen = new Set<string>();
  const upcoming = sortContests(filterContestsByDays([...contests], 7))
    .filter((contest) => {
      const host = getPlatformKey(contest.host);
      if (seen.has(host)) return false;
      seen.add(host);
      return true;
    })
    .slice(0, 6);
  return (
    <div className="site-container">
      <HeroSection contests={contests} today={getContestDay(new Date())} />
      <div id="explore-platforms">
        <ExplorePlatforms contests={contests} />
      </div>
      <section id="contests" className="section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow mb-2">Next 7 days</p>
            <h2 className="section-title">Coming up across platforms</h2>
            <p className="mt-3 text-[13px] text-muted-foreground">
              A look at the next round on each platform.
            </p>
          </div>
          <Link href="/contests" className="text-link">
            View all contests <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {error ? (
          <FeedError message={error} />
        ) : (
          <ContestClientComponent initialContests={upcoming} />
        )}
      </section>
      <ProductFeatures />
    </div>
  );
}
