"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  CalendarPlus,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { getPlatformKey } from "@/lib/platforms";
import { Magnet, Reveal } from "./ui/interaction";
import ContestWeek from "./ContestWeek";

export default function HeroSection({
  contests,
  today,
}: {
  contests: Contest[];
  today: string;
}) {
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
              <a href="#explore-platforms" className="text-link">
                Explore platforms <ArrowUpRight size={15} aria-hidden="true" />
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
            <ContestWeek contests={contests} today={today} />
          </div>
        </div>
      </section>
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
