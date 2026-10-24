import Link from "next/link";
import { BookOpen, ListChecks } from "lucide-react";
export default function JournalNavigation({
  active,
}: {
  active: "entries" | "practice";
}) {
  return (
    <nav className="journal-navigation" aria-label="Journal views">
      <Link
        href="/journal"
        aria-current={active === "entries" ? "page" : undefined}
      >
        <BookOpen size={17} aria-hidden="true" />
        Entries
      </Link>
      <Link
        href="/journal?view=practice"
        aria-current={active === "practice" ? "page" : undefined}
      >
        <ListChecks size={17} aria-hidden="true" />
        To practise
      </Link>
    </nav>
  );
}
