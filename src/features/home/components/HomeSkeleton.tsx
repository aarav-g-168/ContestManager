import {
  SkeletonBlock,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import ContestSkeleton from "@/features/contests/components/ContestSkeleton";
export default function HomeSkeleton() {
  return (
    <SkeletonStatus
      label="Loading the contest overview and upcoming rounds."
      className="site-container discovery-home"
    >
      <div className="discovery-hero" aria-hidden="true">
        <div className="space-y-6">
          <SkeletonBlock className="h-3 w-56" />
          <div className="space-y-3">
            <SkeletonBlock className="h-14 w-80" />
            <SkeletonBlock className="h-14 w-72" />
          </div>
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
          </div>
          <SkeletonBlock className="h-16 w-full" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-9 w-24" />
            <SkeletonBlock className="h-9 w-28" />
          </div>
        </div>
        <div className="schedule-board space-y-7 p-6">
          <SkeletonBlock className="h-3 w-40" />
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-5 border-t border-border pt-6">
              <SkeletonBlock className="h-20 w-14 shrink-0" />
              <div className="min-w-0 flex-1 space-y-4">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-6 w-full" />
                <SkeletonBlock className="h-4 w-3/5" />
              </div>
            </div>
          ))}
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
      <div className="home-contests" aria-hidden="true">
        <SkeletonBlock className="mb-6 h-8 w-60" />
        <div className="mb-6 flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="contest-grid">
          {[0, 1, 2].map((i) => (
            <ContestSkeleton key={i} />
          ))}
        </div>
      </div>
    </SkeletonStatus>
  );
}
