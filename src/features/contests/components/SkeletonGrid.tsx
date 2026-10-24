import ContestSkeleton from "@/features/contests/components/ContestSkeleton";
import { SkeletonStatus } from "@/components/feedback/LoadingSkeleton";
export default function SkeletonGrid() {
  return (
    <SkeletonStatus label="Loading contests.">
      <div className="contest-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <ContestSkeleton key={index} />
        ))}
      </div>
    </SkeletonStatus>
  );
}
