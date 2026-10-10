export default function ContestSkeleton() {
  return (
    <div className="surface p-6" aria-hidden="true">
      <div className="mb-7 flex items-center gap-3">
        <div className="skeleton size-9 !rounded-lg" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton mb-3 h-5 w-5/6" />
      <div className="skeleton mb-7 h-5 w-3/5" />
      <div className="skeleton mb-3 h-3 w-3/4" />
      <div className="skeleton mb-7 h-3 w-1/2" />
      <div className="flex justify-between border-t border-border pt-5">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-24" />
      </div>
    </div>
  );
}
