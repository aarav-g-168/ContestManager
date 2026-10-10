import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HeroSection, { ProductFeatures } from "@/components/hero";
import ContestClientComponent from "@/components/ContestClientComponent";
import FeedError from "@/components/FeedError";
import { getContestFeed } from "@/lib/contestFeed";
import { filterContestsByDays, sortContests } from "@/lib/contestUtils";
import { getPlatformKey } from "@/lib/platforms";
import ExplorePlatforms from "@/components/ExplorePlatforms";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const { contests, error } = await getContestFeed();
  const seen = new Set<string>();
  const corePlatforms = [
    "codeforces.com",
    "leetcode.com",
    "atcoder.jp",
    "codechef.com",
  ];
  const upcoming = sortContests(filterContestsByDays([...contests], 7))
    .filter((contest) => {
      const host = getPlatformKey(contest.host);
      if (seen.has(host)) return false;
      seen.add(host);
      return true;
    })
    .sort(
      (a, b) =>
        Number(!corePlatforms.includes(getPlatformKey(a.host))) -
        Number(!corePlatforms.includes(getPlatformKey(b.host))),
    )
    .slice(0, 6);
  return (
    <div className="site-container">
      <HeroSection contests={contests} />
      <div id="explore-platforms">
        <ExplorePlatforms contests={contests} />
      </div>
      <section id="contests" className="section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow section-label">
              <span>02 /</span> NEXT 7 DAYS
            </p>
            <h2 className="section-title">Coming up this week.</h2>
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
