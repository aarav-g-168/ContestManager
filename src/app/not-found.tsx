import Link from "next/link";
import { ArrowRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="site-container py-16">
      <div className="empty-state">
        <p className="eyebrow mb-5 !text-primary">Error 404</p>
        <h1 className="page-title !text-4xl">Page not found</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This address doesn’t match a page on Contest Manager.
        </p>
        <Link href="/contests" className="btn-primary mt-7">
          Back to contests <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
