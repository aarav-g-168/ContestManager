import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroSection, { ProductFeatures } from "@/components/hero";
import ContestClientComponent from "@/components/ContestClientComponent";
import FeedError from "@/components/FeedError";
import { getContestFeed } from "@/lib/contestFeed";
import { getHomePageContests } from "@/lib/contestUtils";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const { contests, error } = await getContestFeed();
  const upcoming = getHomePageContests(contests).slice(0, 6);
  return (
    <div className="site-container">
      <HeroSection contests={contests} />
      <section id="contests" className="section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow mb-2">Next 7 days</p>
            <h2 className="section-title">Contests this week</h2>
            <p className="mt-3 text-[13px] text-muted-foreground">
              The next events on the calendar.
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
