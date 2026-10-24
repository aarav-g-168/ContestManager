import {
  SkeletonBlock,
  SkeletonHeading,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import "@/features/journal/styles.css";
export function JournalEntriesSkeleton() {
  return (
    <SkeletonStatus label="Loading journal entries." className="journal-grid">
      <SkeletonBlock className="h-80" />
      <SkeletonBlock className="h-80" />
    </SkeletonStatus>
  );
}
export default function JournalSkeleton() {
  return (
    <SkeletonStatus
      label="Loading your private contest journal."
      className="site-container journal-page"
    >
      <SkeletonHeading />
      <div aria-hidden="true">
        <SkeletonBlock className="mb-8 h-28 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <div className="journal-grid mt-6">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    </SkeletonStatus>
  );
}
