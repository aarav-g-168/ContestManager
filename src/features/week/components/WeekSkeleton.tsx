import {
  SkeletonBlock,
  SkeletonHeading,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import "@/features/week/styles.css";
export default function WeekSkeleton() {
  return (
    <SkeletonStatus
      label="Loading your saved contests and reminders."
      className="site-container week-page"
    >
      <SkeletonHeading />
      <div aria-hidden="true">
        <div className="week-top-grid">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
        <SkeletonBlock className="mt-7 h-36 w-full" />
        <SkeletonBlock className="mt-7 h-64 w-full" />
      </div>
    </SkeletonStatus>
  );
}
