import SkeletonGrid from "@/components/SkeletonGrid";

export default function Loading() {
  return (
    <div className="bg-gray-300 dark:bg-black min-h-screen">
      <div className="container mx-auto p-4 md:p-8">

        <div className="h-10 w-72 mx-auto rounded bg-gray-200 dark:bg-zinc-700 animate-pulse mb-6"></div>

        <SkeletonGrid />

      </div>
    </div>
  );
}