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
        eyebrow="Your account"
        title="Bookmarks"
        description="Contests you’ve saved for later."
      >
        <Link href="/contests" className="btn-secondary !text-xs">
          Browse contests <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </PageHeading>
      <ContestClientComponent
        initialContests={contests}
        feedError={error}
        showFilters
        bookmarksOnly
      />
      <p className="mt-7 text-xs text-muted-foreground">
        Showing saved contests scheduled in the next 30 days.
      </p>
    </div>
  );
}
