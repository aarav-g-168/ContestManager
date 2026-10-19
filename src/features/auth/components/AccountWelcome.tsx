import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  UserRound,
} from "lucide-react";
import AuthButton from "@/features/auth/components/AuthButton";

export default function AccountWelcome({
  type,
}: {
  type: "bookmarks" | "reminders";
}) {
  const saved = type === "bookmarks";
  const Icon = saved ? Bookmark : Bell;
  return (
    <div className="account-welcome reveal">
      <div className="account-welcome-story">
        <div className="account-art" aria-hidden="true">
          <div className="account-art-ticket">
            <span>
              <CalendarDays size={18} /> YOUR NEXT ROUND
            </span>
            <div className="ticket-line" />
            <div className="ticket-line short" />
            <div className="ticket-bottom">
              <span>
                <Check size={13} />
                {saved ? "Saved to your shortlist" : "You’ll get a heads-up"}
              </span>
              <Icon size={21} />
            </div>
          </div>
          <span className="account-art-badge">
            <Icon size={23} strokeWidth={1.5} />
          </span>
        </div>
        <p className="eyebrow section-label">
          {saved ? "YOUR PERSONAL SHORTLIST" : "ONE LESS THING TO REMEMBER"}
        </p>
        <h2>
          {saved
            ? "A few good rounds.\nAll in one place."
            : "The start time,\ntaken care of."}
        </h2>
        <p>
          {saved
            ? "See a contest you like? Tap the bookmark. Your saved rounds will be waiting here, whenever you’re ready."
            : "Choose an email reminder from a contest’s bell menu. Get a heads-up 1, 6, or 24 hours before it starts."}
        </p>
      </div>
      <div className="account-welcome-action">
        <span className="empty-state-icon !mx-0">
          <Icon size={23} aria-hidden="true" />
        </span>
        <h2>
          {saved
            ? "Your shortlist starts here."
            : "Never lose track of a round."}
        </h2>
        <p>
          Sign in with Google to{" "}
          {saved
            ? "save contests and find them on any device."
            : "set reminders and manage them in one place."}
        </p>
        <AuthButton expanded />
        <span className="account-signin-note">
          Linked to your Google account. No extra password.
        </span>
        <div className="account-explore-links">
          <Link href="/contests">
            Browse the calendar
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/profile">
            <UserRound size={15} aria-hidden="true" />
            Explore your profile
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
