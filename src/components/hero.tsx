"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Code2,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { getPlatform } from "@/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import { PlatformBadge } from "./contestCard";
import CountdownTimer from "./countdownTimer";
import { Magnet, Reveal, SpotlightCard } from "./ui/interaction";
export default function HeroSection({ contests }: { contests: Contest[] }) {
  const next = contests[0];
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="reveal">
            <p className="eyebrow flex items-center gap-3">
              <span className="status-dot" />
              Made for the ones who keep solving
            </p>
            <h1 className="hero-title">
              Less searching.
              <br />
              <em>More competing.</em>
            </h1>
            <p className="hero-description">
              Your favorite platforms. Your next challenge. One place to find
              contests, save your picks, and show up ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Magnet>
                <Link href="/contests" className="btn-primary">
                  Find your next contest{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Magnet>
              <a href="#how-it-works" className="text-link !text-xs">
                A better way to keep up{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check size={12} className="text-primary" aria-hidden="true" />
                Free to explore
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={12} className="text-primary" aria-hidden="true" />
                All times in IST
              </span>
            </div>
          </div>
          <div className="hero-art reveal" style={{ animationDelay: ".12s" }}>
            <div className="agenda surface">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <p className="eyebrow !text-[10px]">Your contest radar</p>
                <span className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
                  <span
                    className={
                      contests.length
                        ? "status-dot !size-1"
                        : "size-1 rounded-full bg-muted-foreground"
                    }
                  />
                  {contests.length ? "UPCOMING" : "STAY READY"}
                </span>
              </div>
              {next ? (
                <a
                  href={next.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group block px-6 py-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="eyebrow !text-[9px] !text-primary">
                      Next on the horizon
                    </span>
                    <CountdownTimer startTime={next.start} />
                  </div>
                  <h2 className="max-w-[360px] text-[23px] font-medium leading-[1.3] tracking-[-.04em] transition-colors group-hover:text-primary">
                    {next.event}
                  </h2>
                  <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <CalendarDays size={13} aria-hidden="true" />
                    {parseAsUTC(next.start).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                    <ArrowUpRight
                      size={15}
                      className="ml-auto text-primary"
                      aria-hidden="true"
                    />
                  </div>
                </a>
              ) : (
                <div className="px-6 py-8">
                  <Code2
                    size={32}
                    strokeWidth={1}
                    className="mb-5 text-primary"
                    aria-hidden="true"
                  />
                  <h2 className="text-2xl font-medium tracking-tight">
                    One calendar.
                    <br />
                    Every opportunity.
                  </h2>
                  <p className="mt-4 max-w-xs text-xs leading-6 text-muted-foreground">
                    Your next breakthrough starts with showing up. Keep your
                    favorite contests close.
                  </p>
                </div>
              )}
              {contests.slice(1, 3).map((contest) => (
                <a
                  className="agenda-row"
                  key={contest.id}
                  href={contest.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <PlatformBadge host={contest.host} />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">
                      {contest.event}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {getPlatform(contest.host).name}
                    </p>
                  </div>
                  <time
                    className="font-mono text-[10px] text-muted-foreground"
                    dateTime={parseAsUTC(contest.start).toISOString()}
                  >
                    {parseAsUTC(contest.start).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </time>
                </a>
              ))}
              <Link
                href="/contests"
                className="flex items-center justify-between border-t border-border bg-muted/35 px-6 py-3.5 text-[10px] text-muted-foreground"
              >
                Make your next move
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
            <div className="floating-label">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell size={13} aria-hidden="true" />
              </span>
              <span>
                Miss the scrolling.
                <span className="ml-1 font-medium">Keep the contest.</span>
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="platform-strip">
        <p className="platform-strip-label">
          Different platforms.
          <br className="hidden lg:block" /> Same competitive spirit.
        </p>
        {[
          { name: "Codeforces", host: "codeforces.com" },
          { name: "LeetCode", host: "leetcode.com" },
          { name: "AtCoder", host: "atcoder.jp" },
          { name: "CodeChef", host: "codechef.com" },
          { name: "HackerRank", host: "hackerrank.com" },
        ].map((item) => (
          <a
            key={item.host}
            href={`https://${item.host}`}
            target="_blank"
            rel="noreferrer"
            className="platform-wordmark"
          >
            {item.name}
          </a>
        ))}
      </div>
    </>
  );
}
export function ProductFeatures() {
  return (
    <section id="how-it-works" className="section-space border-t border-border">
      <Reveal className="section-heading">
        <div>
          <p className="eyebrow mb-3">A calmer kind of preparation</p>
          <h2 className="section-title">
            You focus on the solve.
            <br />
            <span className="text-muted-foreground">
              We keep track of the start.
            </span>
          </h2>
        </div>
        <p className="max-w-[270px] text-[13px] leading-7 text-muted-foreground">
          A few thoughtful tools to take the busywork out of competitive
          programming.
        </p>
      </Reveal>
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <Reveal>
          <SpotlightCard className="feature-card h-full">
            <div className="feature-illustration">
              <div className="mini-item -rotate-3 flex items-center gap-4">
                <span className="platform-badge !size-7 !text-[10px]">Cf</span>
                <span>Your next challenge</span>
                <BookmarkIllustration />
              </div>
            </div>
            <p className="eyebrow mb-3 !text-[9px]">01 / Make it yours</p>
            <h3 className="text-lg font-medium tracking-tight">
              A shortlist worth saving.
            </h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Bookmark the contests that matter to you. Your picks, synced
              across devices.
            </p>
          </SpotlightCard>
        </Reveal>
        <Reveal delay={0.08}>
          <SpotlightCard className="feature-card h-full">
            <div className="feature-illustration">
              <div className="mini-item flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell size={15} aria-hidden="true" />
                </span>
                <span>
                  Contest starts in 1 hour
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    One less thing to remember.
                  </span>
                </span>
                <span className="status-dot ml-3" />
              </div>
            </div>
            <p className="eyebrow mb-3 !text-[9px]">02 / Stay in the loop</p>
            <h3 className="text-lg font-medium tracking-tight">
              A nudge, when you need it.
            </h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Choose a 1, 6, or 24-hour heads-up. Get an email before it’s time
              to compete.
            </p>
          </SpotlightCard>
        </Reveal>
        <Reveal delay={0.16}>
          <SpotlightCard className="feature-card h-full">
            <div className="feature-illustration gap-2">
              {["MON", "TUE", "WED", "THU", "FRI"].map((day, i) => (
                <div
                  key={day}
                  className={`flex h-16 w-10 flex-col items-center justify-center gap-2 rounded-lg border text-[8px] ${i === 2 ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <span className="font-mono">{day}</span>
                  {i === 2 ? (
                    <Code2 size={16} aria-hidden="true" />
                  ) : (
                    <span className="h-px w-3 bg-border" />
                  )}
                </div>
              ))}
            </div>
            <p className="eyebrow mb-3 !text-[9px]">
              03 / Make room to compete
            </p>
            <h3 className="text-lg font-medium tracking-tight">
              Put it on your calendar.
            </h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Add a contest to Google Calendar with its time, duration, and link
              already filled in.
            </p>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  );
}
function BookmarkIllustration() {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="currentColor"
      className="text-primary"
      aria-hidden="true"
    >
      <path d="M3 1h10a1 1 0 0 1 1 1v17l-6-4-6 4V2a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
