import {
  SkeletonBlock,
  SkeletonHeading,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
import "@/features/admin/styles.css";
export default function AdminSkeleton({
  contained = false,
}: {
  contained?: boolean;
}) {
  return (
    <SkeletonStatus
      label="Loading reminder operations."
      className={contained ? "py-12" : "site-container admin-dashboard py-12"}
    >
      <SkeletonHeading />
      <div aria-hidden="true">
        <div className="mb-6 flex flex-wrap justify-between gap-4">
          <SkeletonBlock className="h-5 w-52" />
          <SkeletonBlock className="h-11 w-48" />
        </div>
        <div className="admin-metrics">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="admin-metric space-y-5 p-6">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-10 w-20" />
              <SkeletonBlock className="h-3 w-full" />
            </div>
          ))}
        </div>
        <SkeletonBlock className="my-6 h-20 w-full" />
        <div className="admin-middle">
          <div className="admin-panel space-y-6 p-6">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-52 w-full" />
          </div>
          <div className="admin-panel space-y-6 p-6">
            <SkeletonBlock className="h-5 w-32" />
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
        <div className="admin-panel mt-6 space-y-5 p-6">
          <SkeletonBlock className="h-6 w-48" />
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </SkeletonStatus>
  );
}
