"use client";
import { useEffect } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="site-container py-16">
      <div className="empty-state">
        <p className="eyebrow mb-5 !text-primary">Page error</p>
        <h1 className="page-title !text-4xl">Unable to load this page</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
          Try again, or return to the contest calendar.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            <RotateCcw size={14} aria-hidden="true" />
            Try again
          </button>
          <Link href="/contests" className="btn-secondary">
            Explore contests <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
