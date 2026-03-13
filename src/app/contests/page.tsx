import type { Contest } from "../types/contest";

export default function ContestsPage() {
  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-600">
        All Upcoming Contests
      </h1>

      <p className="text-center text-gray-600">
        All the upcoming programming contests from various platforms in one place. Stay tuned.
      </p>
    </div>
  );
}