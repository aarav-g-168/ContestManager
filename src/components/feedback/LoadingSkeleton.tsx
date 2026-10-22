import type { ReactNode } from "react";

/** Decorative shape; its surrounding loading region supplies the accessible name. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block max-w-full ${className}`}
    />
  );
}
export function SkeletonStatus({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
export function SkeletonHeading() {
  return (
    <div aria-hidden="true" className="mb-8 space-y-4">
      <SkeletonBlock className="h-3 w-36" />
      <SkeletonBlock className="h-12 w-72" />
      <SkeletonBlock className="h-4 w-96" />
    </div>
  );
}
