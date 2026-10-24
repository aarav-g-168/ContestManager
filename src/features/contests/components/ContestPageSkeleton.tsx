import PageHeading from "@/components/layout/PageHeading";
import ContestResultsSkeleton from "@/features/contests/components/ContestResultsSkeleton";
export default function ContestPageSkeleton({
  variant = "contests",
}: {
  variant?: "contests" | "bookmarks" | "reminders";
}) {
  const content = {
    contests: {
      eyebrow: "The contest calendar",
      title: "Upcoming contests",
      description:
        "Search, pick a platform, or narrow it down to your next free day.",
    },
    bookmarks: {
      eyebrow: "Your account",
      title: "Bookmarks",
      description: "Contests you’ve saved for later.",
    },
    reminders: {
      eyebrow: "Your account",
      title: "Email reminders",
      description: "Manage the reminders you’ve set for upcoming contests.",
    },
  }[variant];
  return (
    <div
      className={`site-container pb-10 ${variant === "contests" ? "contests-page" : ""}`}
    >
      <PageHeading {...content} />
      <ContestResultsSkeleton
        showFilters
        calendar={variant === "contests"}
        label={`Loading ${content.title.toLowerCase()}.`}
      />
    </div>
  );
}
