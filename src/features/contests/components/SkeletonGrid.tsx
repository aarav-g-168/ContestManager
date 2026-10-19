import ContestSkeleton from "@/features/contests/components/ContestSkeleton";
export default function SkeletonGrid() {
  return (
    <div role="status" aria-label="Loading contests">
      <span className="sr-only">Loading contests...</span>
      <div className="contest-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <ContestSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
