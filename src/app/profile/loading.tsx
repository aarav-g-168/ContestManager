export default function ProfileLoading() {
  return (
    <div
      className="site-container py-12"
      role="status"
      aria-label="Loading your workspace"
    >
      <span className="sr-only">Loading your workspace...</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-12 w-80 max-w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-80 !rounded-2xl" />
          <div className="skeleton h-80 !rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
