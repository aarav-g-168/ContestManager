"use client";
import { RefreshCw, WifiOff } from "lucide-react";
export default function FeedError({ message }: { message: string }) {
  return (
    <div
      className="surface flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center"
      role="alert"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <WifiOff size={20} aria-hidden="true" />
      </span>
      <div className="flex-1">
        <h2 className="text-sm font-medium">
          The contest feed needs a moment.
        </h2>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          {message}
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="btn-secondary !text-xs"
      >
        <RefreshCw size={13} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
