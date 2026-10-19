import type { Metadata } from "next";
import { Mail } from "lucide-react";
import ContestClientComponent from "@/features/contests/components/ContestBrowser";
import PageHeading from "@/components/layout/PageHeading";
import { getContestFeed } from "@/features/contests/server/feed";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your reminders" };
export default async function RemindersPage() {
  const { contests, error } = await getContestFeed();
  return (
    <div className="site-container pb-10">
      <PageHeading
        eyebrow="Your account"
        title="Email reminders"
        description="Manage the reminders you’ve set for upcoming contests."
      >
        <span className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-xs text-muted-foreground">
          <Mail size={14} className="text-primary" aria-hidden="true" />
          Sent to your account email
        </span>
      </PageHeading>
      <ContestClientComponent
        initialContests={contests}
        feedError={error}
        showFilters
        remindersOnly
      />
    </div>
  );
}
