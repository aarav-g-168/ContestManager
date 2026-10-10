import Link from "next/link";
export default function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center gap-2.5"
      aria-label="Contest Manager home"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-[-.02em] max-[360px]:text-[13px]">
        contest
        <span className="font-normal text-muted-foreground">manager</span>
        <span className="text-primary">.</span>
      </span>
    </Link>
  );
}
