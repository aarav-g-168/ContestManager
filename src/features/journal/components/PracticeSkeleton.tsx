import {
  SkeletonBlock,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
export default function PracticeSkeleton() {
  return (
    <SkeletonStatus
      label="Loading your practice queue"
      className="practice-list"
    >
      {[0, 1, 2].map((i) => (
        <div className="practice-card" key={i}>
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-7 w-3/4 my-4" />
          <SkeletonBlock className="h-11 w-44" />
        </div>
      ))}
    </SkeletonStatus>
  );
}
