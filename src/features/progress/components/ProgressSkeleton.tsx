import {
  SkeletonBlock,
  SkeletonHeading,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import "@/features/progress/styles.css";
export default function ProgressSkeleton() {
  return (
    <SkeletonStatus
      label="Loading your journal progress."
      className="site-container progress-page"
    >
      <SkeletonHeading />
      <div aria-hidden="true">
        <SkeletonBlock className="my-8 h-20 w-full" />
        <div className="progress-metrics">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-36" />
          ))}
        </div>
        <div className="progress-feature-grid mt-7">
          <SkeletonBlock className="h-96" />
          <SkeletonBlock className="h-96" />
        </div>
      </div>
    </SkeletonStatus>
  );
}
