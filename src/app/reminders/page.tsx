import type { Metadata } from "next";
import { Mail } from "lucide-react";
import ContestClientComponent from "@/components/ContestClientComponent";
import PageHeading from "@/components/PageHeading";
import { getContestFeed } from "@/lib/contestFeed";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your reminders" };
export default async function RemindersPage() {
  const { contests, error } = await getContestFeed();
  return (
    <div className="site-container pb-10">
      <PageHeading
        eyebrow="Right place. Right time."
        title="Never miss the start"
        description="A heads-up for the contests you care about. Your reminders, neatly lined up."
      >
        <span className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-xs text-muted-foreground">
          <Mail size={14} className="text-primary" aria-hidden="true" />
          Delivered to your inbox
        </span>
      </PageHeading>
      <div className="mb-7 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-xs leading-6 text-muted-foreground">
        <Mail className="mt-1 text-primary" size={15} aria-hidden="true" />
        <p>
          Choose a reminder from any contest’s bell menu. We’ll email you 1, 6,
          or 24 hours before it starts. Change or remove a reminder from that
          same menu.
        </p>
      </div>
      <ContestClientComponent
        initialContests={contests}
        feedError={error}
        showFilters
        remindersOnly
      />
    </div>
  );
}
