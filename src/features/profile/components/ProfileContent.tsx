"use client";
import { Code2, GitFork, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useProfile } from "@/features/profile/components/ProfileProvider";
import AuthButton from "@/features/auth/components/AuthButton";
import PageHeading from "@/components/layout/PageHeading";
import ProfileEditor from "@/features/profile/components/ProfileEditor";

export default function ProfileContent() {
  const { user, loading: authLoading } = useAuth();
  const account = useProfile();
  return (
    <div className="site-container profile-page pb-10">
      <PageHeading
        eyebrow="Your account"
        title="Your profile"
        description="Your details, coding handles, and the places you share your work."
      >
        <span className="profile-account-badge">
          <LockKeyhole size={14} aria-hidden="true" />
          Personal account
        </span>
      </PageHeading>
      {authLoading || (user && account.loading) ? (
        <div
          className="profile-layout"
          aria-label="Loading profile"
          aria-busy="true"
        >
          <div className="surface p-7">
            <div className="skeleton mb-6 size-20 !rounded-full" />
            <div className="skeleton mb-4 h-6 w-40" />
            <div className="skeleton h-4 w-52 max-w-full" />
          </div>
          <div className="surface p-7">
            <div className="skeleton mb-8 h-6 w-40" />
            <div className="skeleton mb-6 h-12" />
            <div className="skeleton mb-6 h-28" />
            <div className="skeleton h-12" />
          </div>
        </div>
      ) : !user ? (
        <div className="profile-signin-layout">
          <div className="profile-signin-feature">
            <Code2 size={34} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="profile-signin-kicker">
                Your space in Contest Manager
              </p>
              <h2>
                Your contests.
                <br />
                Your coding profile.
              </h2>
              <p>
                Add your bio and coding handles, keep useful links together, and
                make this account your own.
              </p>
            </div>
            <div className="profile-signin-tags">
              <span>
                <UserRound size={15} aria-hidden="true" />
                Personal details
              </span>
              <span>
                <GitFork size={15} aria-hidden="true" />
                Social links
              </span>
              <span>
                <Code2 size={15} aria-hidden="true" />
                Coding handles
              </span>
            </div>
          </div>
          <div className="surface p-8 sm:p-10">
            <span className="empty-state-icon !mx-0">
              <LockKeyhole size={23} aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-medium">
              Sign in to edit your profile
            </h2>
            <p className="my-4 max-w-sm text-sm leading-7 text-muted-foreground">
              Use your Google account to save your details, bookmarks, and
              contest reminders across devices.
            </p>
            <AuthButton expanded />
            <p className="profile-helper mt-6">
              Your profile is personal to your account. It won’t be published as
              a public page.
            </p>
          </div>
        </div>
      ) : account.error || !account.profile ? (
        <div className="empty-state" role="alert">
          <h2 className="text-xl font-medium">We couldn’t load your profile</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {account.error || "Try loading it again."}
          </p>
          <button className="btn-secondary mt-6" onClick={account.reload}>
            Try again
          </button>
        </div>
      ) : (
        <ProfileEditor key={user.uid} initial={account.profile} />
      )}
    </div>
  );
}
