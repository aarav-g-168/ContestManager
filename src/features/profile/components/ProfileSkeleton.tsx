import {
  SkeletonBlock,
  SkeletonHeading,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
export function ProfileFieldsSkeleton() {
  return (
    <SkeletonStatus label="Loading your profile." className="profile-layout">
      <div className="space-y-6" aria-hidden="true">
        <div className="surface space-y-5 p-7">
          <SkeletonBlock className="size-24 !rounded-full" />
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-4 w-52" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
        <div className="surface space-y-5 p-6">
          <SkeletonBlock className="h-5 w-full" />
          <SkeletonBlock className="h-5 w-4/5" />
        </div>
      </div>
      <div className="surface space-y-7 p-7" aria-hidden="true">
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-6 w-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock
              className={i === 2 ? "h-28 w-full" : "h-12 w-full"}
            />
          </div>
        ))}
        <SkeletonBlock className="h-12 w-36" />
      </div>
    </SkeletonStatus>
  );
}
export default function ProfileSkeleton() {
  return (
    <div className="site-container profile-page py-12">
      <SkeletonHeading />
      <ProfileFieldsSkeleton />
    </div>
  );
}
