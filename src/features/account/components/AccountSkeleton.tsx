import {
  SkeletonBlock,
  SkeletonHeading,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
export default function AccountSkeleton({
  label = "Loading account settings",
  contained = false,
}: {
  label?: string;
  contained?: boolean;
}) {
  return (
    <SkeletonStatus
      label={label}
      className={contained ? undefined : "site-container py-12"}
    >
      <SkeletonHeading />
      <SkeletonBlock className="h-72 my-8" />
      <SkeletonBlock className="h-60 my-8" />
      <SkeletonBlock className="h-48" />
    </SkeletonStatus>
  );
}
