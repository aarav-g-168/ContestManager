import SkeletonGrid from "@/components/SkeletonGrid";
export default function Loading() {
  return (
    <div className="site-container py-12">
      <div aria-hidden="true" className="mb-9 space-y-5">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-12 w-96 max-w-full" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>
      <SkeletonGrid />
    </div>
  );
}
