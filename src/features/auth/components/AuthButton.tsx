"use client";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  ChevronDown,
  LoaderCircle,
  LogOut,
  UserRound,
  ShieldCheck,
  CalendarDays,
  BookOpen,
  Activity,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useProfile } from "@/features/profile/components/ProfileProvider";
import ProfileAvatar from "@/features/profile/components/ProfileAvatar";
import { useAdminAccess } from "@/features/admin/hooks/useAdminAccess";
import {
  SkeletonBlock,
  SkeletonStatus,
} from "@/components/feedback/LoadingSkeleton";
export default function AuthButton({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const { user, loading, busy, login, logout } = useAuth();
  const { profile, photoURL } = useProfile();
  const isAdmin = useAdminAccess();
  const name =
    profile?.values.displayName || user?.displayName || "Your account";
  if (loading)
    return (
      <SkeletonStatus label="Checking your session.">
        <SkeletonBlock className="h-11 w-[86px] max-[360px]:w-[66px]" />
      </SkeletonStatus>
    );
  if (!user)
    return (
      <button
        className="btn-primary !min-h-10 !px-3.5 !py-2 !text-xs sm:!px-4"
        onClick={login}
        disabled={busy}
      >
        {busy ? (
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
        ) : null}
        {expanded ? "Continue with Google" : "Sign in"}
        {!busy && (
          <ArrowUpRight
            size={14}
            className={expanded ? undefined : "max-[360px]:hidden"}
            aria-hidden="true"
          />
        )}
      </button>
    );
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-muted"
          aria-label="Open account menu"
        >
          <ProfileAvatar
            src={profile ? photoURL : user.photoURL}
            name={name}
            size={32}
          />
          <ChevronDown
            size={13}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={12}
          className="z-50 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="px-3 py-3">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {[
            { href: "/week", label: "My week", icon: CalendarDays },
            { href: "/journal", label: "Contest journal", icon: BookOpen },
            { href: "/progress", label: "Your progress", icon: Activity },
            { href: "/profile", label: "Your profile", icon: UserRound },
            { href: "/bookmarks", label: "Saved contests", icon: Bookmark },
            { href: "/reminders", label: "Your reminders", icon: Bell },
          ].map(({ href, label, icon: Icon }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link href={href} className="menu-item">
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}
          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link href="/admin" className="menu-item">
                <ShieldCheck size={15} aria-hidden="true" />
                Admin dashboard
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className="menu-item text-muted-foreground"
            disabled={busy}
            onSelect={logout}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
