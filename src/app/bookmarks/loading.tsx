import SkeletonGrid from "@/components/SkeletonGrid";

export default function Loading() {
  return (
    <div className="bg-gray-300 dark:bg-black min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <SkeletonGrid />
      </div>
    </div>
  );
}