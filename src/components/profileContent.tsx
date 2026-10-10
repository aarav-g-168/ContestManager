"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  Code2,
  Globe2,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useBookmarks } from "@/hooks/bookmarks";
import { useReminders } from "@/hooks/reminders";
import AuthButton from "./AuthButton";
import PageHeading from "./PageHeading";
import { Reveal, SpotlightCard } from "./ui/interaction";
export default function ProfileContent() {
  const { user, loading } = useAuth();
  const bookmarks = useBookmarks();
  const reminders = useReminders();
  const { resolvedTheme, setTheme } = useTheme();
  const [avatarFailed, setAvatarFailed] = useState(false);
  if (loading)
    return (
      <div className="site-container">
        <PageHeading
          eyebrow="Your account"
          title="Profile & preferences"
          description="Manage your bookmarks, reminders, and theme."
        />
        <div className="surface p-8">
          <div className="skeleton mb-6 size-20 !rounded-2xl" />
          <div className="skeleton mb-4 h-6 w-52" />
          <div className="skeleton h-4 w-72 max-w-full" />
        </div>
      </div>
    );
  if (!user)
    return (
      <div className="site-container pb-10">
        <PageHeading
          eyebrow="Your account"
          title="Profile & preferences"
          description="Sign in to access your saved contests and email reminders."
        />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <div className="relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-xl border border-border bg-muted/40 p-8 sm:p-10">
              <Code2
                size={38}
                strokeWidth={1.25}
                className="text-primary"
                aria-hidden="true"
              />
              <div className="mt-10">
                <h2 className="text-[30px] font-medium leading-tight tracking-[-.02em]">
                  Keep your contests
                  <br />
                  in one account
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
                  Bookmarks and reminders are saved to your Google account, so
                  you can access them on your other devices.
                </p>
              </div>
              <p className="eyebrow mt-8 !text-[9px]">
                Google account required
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="surface flex h-full flex-col items-start justify-center p-8 sm:p-10">
              <span className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-border bg-muted">
                <ShieldCheck
                  size={22}
                  className="text-primary"
                  aria-hidden="true"
                />
              </span>
              <h2 className="text-2xl font-medium tracking-tight">
                Sign in to Contest Manager
              </h2>
              <p className="mb-6 mt-3 text-sm leading-7 text-muted-foreground">
                Use your Google account to save contests and manage reminders.
              </p>
              <AuthButton expanded />
              <div className="mt-8 space-y-3 border-t border-border pt-6 text-xs text-muted-foreground">
                {[
                  "Save contests for later",
                  "Get reminders by email",
                  "Access your bookmarks on any device",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check
                      size={13}
                      className="text-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    );
  return (
    <div className="site-container pb-10">
      <PageHeading
        eyebrow="Your account"
        title="Profile & preferences"
        description="Manage your bookmarks, email reminders, and theme."
      >
        <Link href="/contests" className="btn-primary">
          Browse contests <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </PageHeading>
      <div className="grid items-start gap-6 lg:grid-cols-[.85fr_1.5fr]">
        <Reveal>
          <div className="surface overflow-hidden">
            <div className="relative h-24 border-b border-border bg-primary/5">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(var(--primary) 1px, transparent 1px)",
                  backgroundSize: "15px 15px",
                }}
              />
            </div>
            <div className="px-7 pb-7">
              <div className="relative -mt-9 mb-5 flex size-[76px] items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-muted text-2xl text-primary">
                {user.photoURL && !avatarFailed ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "Your profile"}
                    width={76}
                    height={76}
                    unoptimized
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  user.displayName?.charAt(0) || "C"
                )}
              </div>
              <h2 className="text-xl font-medium tracking-tight">
                {user.displayName || "Competitive programmer"}
              </h2>
              <p className="mt-2 flex items-center gap-2 break-all text-xs text-muted-foreground">
                <Mail size={13} aria-hidden="true" />
                {user.email}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1.5 font-mono text-[9px]">
                <span className="status-dot !size-1" />
                COMPETITIVE PROGRAMMER
              </span>
              <div className="mt-7 space-y-4 border-t border-border pt-6">
                <p className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Globe2 size={14} aria-hidden="true" />
                    Display timezone
                  </span>
                  <span>IST (UTC+5:30)</span>
                </p>
                <p className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck size={14} aria-hidden="true" />
                    Connected with
                  </span>
                  <span>Google</span>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                href: "/bookmarks",
                label: "Saved contests",
                count: bookmarks.bookmarkedContests.length,
                busy: bookmarks.loading,
                error: bookmarks.error,
                icon: Bookmark,
                copy: "View your bookmarks",
              },
              {
                href: "/reminders",
                label: "Active reminders",
                count: Object.keys(reminders.reminders).length,
                busy: reminders.loading,
                error: reminders.error,
                icon: Bell,
                copy: "Manage email reminders",
              },
            ].map(({ href, label, count, busy, error, icon: Icon, copy }) => (
              <Reveal key={href}>
                <SpotlightCard className="p-6">
                  <Link href={href} className="group block">
                    <div className="flex justify-between">
                      <Icon
                        size={20}
                        className="text-primary"
                        aria-hidden="true"
                      />
                      <ArrowUpRight
                        size={16}
                        className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="my-6 font-mono text-4xl tracking-tighter">
                      {busy
                        ? "…"
                        : error
                          ? "—"
                          : String(count).padStart(2, "0")}
                    </p>
                    <h2 className="text-sm font-medium">{label}</h2>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {error ? "Couldn't load. Open to retry." : copy}
                    </p>
                  </Link>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="surface p-6 sm:p-7">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-sm font-medium">Appearance</h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Choose a light or dark theme.
                  </p>
                </div>
              </div>
              <div className="mt-5 inline-flex gap-2 rounded-xl border border-border bg-background p-1.5">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-5 text-xs transition-colors ${resolvedTheme === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setTheme(value)}
                    aria-pressed={resolvedTheme === value}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal>
            <Link
              href="/contests"
              className="group flex items-center gap-4 rounded-xl border border-border p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary">
                <CalendarDays size={18} aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">
                  Contest calendar
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  View upcoming programming contests.
                </span>
              </span>
              <ArrowRight
                size={17}
                className="text-primary transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
