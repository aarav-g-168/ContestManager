import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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
      <HeroSection contests={contests.slice(0, 3)} />
      <section id="contests" className="section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow mb-3">Good things on the horizon</p>
            <h2 className="section-title">
              This week’s starting line<span className="text-primary">.</span>
            </h2>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Find your rhythm. Pick your next challenge.
            </p>
          </div>
          <Link href="/contests" className="text-link">
            Explore all contests <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {error ? (
          <FeedError message={error} />
        ) : (
          <ContestClientComponent initialContests={upcoming} />
        )}
      </section>
      <ProductFeatures />
      <section className="relative mb-5 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-7 py-9 sm:px-10 sm:py-11">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow mb-3 !text-primary">
              Your next personal best is out there
            </p>
            <h2 className="text-[28px] font-medium leading-tight tracking-[-.045em]">
              Show up. Solve. Repeat.
            </h2>
            <p className="mt-3 text-xs text-muted-foreground">
              A great contest is a good place to start.
            </p>
          </div>
          <Link href="/contests" className="btn-primary">
            Let’s find your next one{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
