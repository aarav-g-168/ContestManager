import Link from "next/link";
import { ArrowUpRight, Code2 } from "lucide-react";
import Brand from "./Brand";
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="site-container flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-xs text-muted-foreground">
            Less searching. More competing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <Link href="/contests" className="hover:text-foreground">
            Explore contests
          </Link>
          <a
            href="https://github.com/aarav-g-168"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 hover:text-foreground"
            aria-label="Aarav Gupta on GitHub (opens in a new tab)"
          >
            <Code2 size={14} aria-hidden="true" /> GitHub
          </a>
          <a
            href="https://aaravgupta.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 hover:text-foreground"
          >
            Built by Aarav Gupta <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
