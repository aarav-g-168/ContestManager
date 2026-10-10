import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ContestClientComponent from "@/components/ContestClientComponent";
import PageHeading from "@/components/PageHeading";
import { getContestFeed } from "@/lib/contestFeed";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your bookmarks" };
export default async function BookmarksPage() {
  const { contests, error } = await getContestFeed();
  return (
    <div className="site-container pb-10">
      <PageHeading
        eyebrow="A little more intentional"
        title="Your shortlist"
        description="The challenges that caught your eye, all in one place. Make time for the ones that matter."
      >
        <Link href="/contests" className="btn-secondary !text-xs">
          Discover more <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </PageHeading>
      <ContestClientComponent
        initialContests={contests}
        feedError={error}
        showFilters
        bookmarksOnly
      />
      <p className="mt-7 text-xs text-muted-foreground">
        Your shortlist shows saved contests within the upcoming 30 days.
      </p>
    </div>
  );
}
