"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  CalendarPlus,
  Clock3,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { getPlatform, getPlatformKey } from "@/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import CountdownTimer from "./countdownTimer";
import { Magnet, Reveal } from "./ui/interaction";

export default function HeroSection({ contests }: { contests: Contest[] }) {
  const platformCount = new Set(
    contests.map((contest) => getPlatformKey(contest.host)),
  ).size;
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid">
          <div className="reveal">
            <p className="hero-kicker">
              <CalendarDays size={16} aria-hidden="true" /> Competitive
              programming calendar
            </p>
            <h1 id="hero-title" className="hero-title">
              Find your
              <br />
              <em>next contest</em>
            </h1>
            <p className="hero-description">
              Codeforces, LeetCode, AtCoder and more. Check start times, save
              contests, and get an email before they begin.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Magnet>
                <Link href="/contests" className="btn-primary">
                  Browse contests <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </Magnet>
              <a href="#how-it-works" className="text-link">
                How it works <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
            <dl className="hero-facts">
              {contests.length > 0 && (
                <>
                  <div>
                    <dt>Next 30 days</dt>
                    <dd>
                      <span>{contests.length}</span> contests
                    </dd>
                  </div>
                  <div>
                    <dt>In the calendar</dt>
                    <dd>
                      <span>{platformCount}</span> platforms
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>Display timezone</dt>
                <dd>
                  IST{" "}
                  <span className="!text-muted-foreground !font-normal !text-xs">
                    UTC+5:30
                  </span>
                </dd>
              </div>
            </dl>
          </div>
          <div className="hero-art reveal" style={{ animationDelay: ".1s" }}>
            <div className="agenda surface">
              <div className="agenda-header">
                <div className="flex items-center gap-3">
                  <span className="agenda-icon">
                    <CalendarDays size={18} aria-hidden="true" />
                  </span>
                  <h2 id="agenda-title">Next up</h2>
                </div>
                <span className="agenda-label">
                  <span className="status-dot" />{" "}
                  {contests.length ? "Upcoming" : "Calendar"}
                </span>
              </div>
              <div aria-labelledby="agenda-title">
                {contests.slice(0, 3).map((contest) => {
                  const start = parseAsUTC(contest.start);
                  return (
                    <a
                      key={contest.id}
                      className="agenda-entry group"
                      href={contest.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${contest.event} on ${getPlatform(contest.host).name} (opens in a new tab)`}
                    >
                      <time
                        className="agenda-date"
                        dateTime={start.toISOString()}
                      >
                        <span>
                          {start.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                        {start.toLocaleDateString("en-GB", {
                          month: "short",
                          timeZone: "Asia/Kolkata",
                        })}
                      </time>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>{getPlatform(contest.host).name}</span>
                          <CountdownTimer startTime={contest.start} />
                        </div>
                        <h3 className="agenda-event">{contest.event}</h3>
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 size={12} aria-hidden="true" />
                          {start.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Asia/Kolkata",
                          })}{" "}
                          IST{" "}
                          <ArrowUpRight
                            size={14}
                            className="ml-auto text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </p>
                      </div>
                    </a>
                  );
                })}
                {!contests.length && (
                  <div className="px-6 py-10">
                    <h3 className="text-lg font-medium">
                      No contest data available
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Open the calendar to retry the contest feed.
                    </p>
                  </div>
                )}
              </div>
              <Link href="/contests" className="agenda-footer">
                View full calendar <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="platform-strip">
        <p className="platform-strip-label">Contests from</p>
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
            aria-label={`${item.name} (opens in a new tab)`}
          >
            {item.name}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        ))}
      </div>
    </>
  );
}

export function ProductFeatures() {
  const steps = [
    {
      title: "Save a contest",
      description: "Use the bookmark icon to save a contest to your account.",
      icon: Bookmark,
      href: "/bookmarks",
      label: "Your bookmarks",
    },
    {
      title: "Set an email reminder",
      description:
        "Choose 1, 6, or 24 hours before the start from the bell menu.",
      icon: Bell,
      href: "/reminders",
      label: "Your reminders",
    },
    {
      title: "Add it to your calendar",
      description:
        "Open Google Calendar with the contest’s time and link already filled in.",
      icon: CalendarPlus,
      href: "/contests",
      label: "Browse contests",
    },
  ];
  return (
    <section id="how-it-works" className="section-space border-t border-border">
      <div className="section-heading">
        <div>
          <p className="eyebrow mb-2">Getting started</p>
          <h2 className="section-title">How it works</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Sign in with Google to save contests and set reminders.
        </p>
      </div>
      <div className="workflow surface">
        {steps.map(({ title, description, icon: Icon, href, label }, index) => (
          <Reveal
            key={title}
            className="workflow-step min-w-0"
            delay={index * 0.06}
          >
            <div className="mb-6 flex items-center justify-between">
              <Icon
                size={23}
                strokeWidth={1.6}
                className="text-primary"
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-muted-foreground">
                0{index + 1}
              </span>
            </div>
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <Link href={href} className="text-link mt-auto">
              {label}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
