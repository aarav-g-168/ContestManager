import {
  SkeletonBlock,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import ContestSkeleton from "@/features/contests/components/ContestSkeleton";
export default function ContestResultsSkeleton({
  showFilters = false,
  calendar = false,
  label = "Loading contests.",
}: {
  showFilters?: boolean;
  calendar?: boolean;
  label?: string;
}) {
  return (
    <SkeletonStatus label={label}>
      {showFilters && (
        <div aria-hidden="true" className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-12 min-w-0 flex-1" />
            <SkeletonBlock className="h-12 w-28" />
          </div>
          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-24" />
          </div>
        </div>
      )}
      {calendar && (
        <div aria-hidden="true" className="mb-6 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      )}
      <div
        aria-hidden="true"
        className="mb-5 flex items-center justify-between gap-4"
      >
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-10 w-28" />
      </div>
      <div className="contest-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <ContestSkeleton key={i} />
        ))}
      </div>
    </SkeletonStatus>
  );
}
