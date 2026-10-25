import Link from "next/link";
import { ArrowUpRight, Code2 } from "lucide-react";
import Brand from "@/components/layout/Brand";
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="site-container">
        <div className="footer-main">
          <div>
            <Brand />
            <p className="footer-description">
              Good problems are worth making time for. Find your next round
              here.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <div>
              <p>EXPLORE</p>
              <Link href="/contests">
                Contest calendar <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
              <Link href="/bookmarks">Your bookmarks</Link>
              <Link href="/reminders">Email reminders</Link>
            </div>
            <div>
              <p>MAKE IT YOURS</p>
              <Link href="/profile">Your profile</Link>
              <Link href="/settings">Settings & privacy</Link>
              <Link href="/support">Help & feedback</Link>
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/terms">Terms</Link>
              <a
                href="https://github.com/aarav-g-168"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground"
                aria-label="Aarav Gupta on GitHub (opens in a new tab)"
              >
                <Code2 size={14} aria-hidden="true" /> GitHub
              </a>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>
            <Code2 size={13} aria-hidden="true" /> Made for people who like a
            good problem.
          </span>
          <a
            href="https://aarav.site"
            target="_blank"
            rel="noreferrer"
            aria-label="Aarav Gupta’s portfolio (opens in a new tab)"
          >
            Built by Aarav Gupta <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
