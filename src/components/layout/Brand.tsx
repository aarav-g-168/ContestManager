import Link from "next/link";
export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Contest Manager home">
      <span className="brand-mark">
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
      <span className="brand-wordmark">
        contest
        <span className="font-normal text-muted-foreground">manager</span>
        <span className="text-primary">.</span>
      </span>
    </Link>
  );
}
