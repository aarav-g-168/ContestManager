export default function ContestSkeleton() {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-md animate-pulse">
            <div className="flex justify-between items-center mb-4">
                <div className="h-8 w-20 rounded bg-gray-200 dark:bg-zinc-700"></div>
                <div className="h-5 w-24 rounded bg-gray-200 dark:bg-zinc-700"></div>
            </div>

            <div className="space-y-3">
                <div className="h-5 w-full rounded bg-gray-200 dark:bg-zinc-700"></div>
                <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-zinc-700"></div>
            </div>

            <div className="mt-4 space-y-2">
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-zinc-700"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-zinc-700"></div>
            </div>

            <div className="mt-6">
                <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-zinc-700"></div>
            </div>
        </div>
    );
}