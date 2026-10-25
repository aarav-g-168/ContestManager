import GettingStarted from "@/features/account/components/GettingStarted";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import HeroSection, {
  ProductFeatures,
} from "@/features/home/components/HeroSection";
import HomeDiscovery from "@/features/home/components/HomeDiscovery";
import FeedError from "@/features/contests/components/FeedError";
import { getContestFeed } from "@/features/contests/server/feed";
import ExplorePlatforms from "@/features/home/components/ExplorePlatforms";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const { contests, error } = await getContestFeed();
  return (
    <div className="site-container discovery-home">
      <HeroSection contests={contests} />
      <GettingStarted />
      <section
        id="contests"
        className="home-contests"
        aria-labelledby="home-contests-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="home-contests-title" className="section-title">
              Coming up next.
            </h2>
          </div>
          <Link href="/contests" className="text-link">
            Full calendar - <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {error ? (
          <FeedError message={error} />
        ) : (
          <HomeDiscovery contests={contests} />
        )}
      </section>
      <div id="explore-platforms">
        <ExplorePlatforms contests={contests} />
      </div>
      <ProductFeatures />
    </div>
  );
}
