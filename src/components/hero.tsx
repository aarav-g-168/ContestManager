"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Search,
  UserRound,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { getPlatform } from "@/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import { sortContests } from "@/lib/contestUtils";
import { PlatformBadge } from "./contestCard";
import CountdownTimer from "./countdownTimer";
import { Reveal } from "./ui/interaction";

export default function HeroSection({ contests }: { contests: Contest[] }) {
  const next = sortContests([...contests]).slice(0, 2);
  return (
    <section className="discovery-hero" aria-labelledby="hero-title">
      <div className="discovery-intro">
        <p className="discovery-kicker">
          <span aria-hidden="true" /> THE CODING CONTEST CALENDAR
        </p>
        <h1 id="hero-title">
          Less searching.
          <br />
          <span>More competing.</span>
        </h1>
        <p className="discovery-description">
          Your next Codeforces round. This weekend’s LeetCode contest. Find them
          all here, and make a plan.
        </p>
        <form action="/contests" className="landing-search" role="search">
          <Search size={20} aria-hidden="true" />
          <label className="sr-only" htmlFor="landing-query">
            Search contests or platforms
          </label>
          <input
            id="landing-query"
            name="q"
            placeholder="Find a contest or platform…"
            maxLength={200}
          />
          <button type="submit" aria-label="Search contests">
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </form>
        <div className="discovery-shortcuts">
          <span>Start with</span>
          <Link href="/contests?range=1">
            Next 24 hours <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          <Link href="/contests?platform=leetcode.com">
            LeetCode <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
          <Link href="/contests?platform=codeforces.com">
            Codeforces <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <Link href="/week" className="text-link mt-5">Plan my week <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="schedule-board">
        <div className="schedule-board-heading">
          <span>ON THE SCHEDULE</span>
          <span>IST · UTC+5:30</span>
        </div>
        {next.length ? (
          next.map((contest, index) => {
            const start = parseAsUTC(contest.start);
            return (
              <a
                className={`schedule-entry ${index === 0 ? "schedule-entry-featured" : ""}`}
                key={contest.id}
                href={contest.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${contest.event} (opens in a new tab)`}
              >
                <div className="schedule-entry-date">
                  <strong>
                    {start.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      timeZone: "Asia/Kolkata",
                    })}
                  </strong>
                  <span>
                    {start.toLocaleDateString("en-GB", {
                      month: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <div className="schedule-entry-copy">
                  <span className="schedule-platform">
                    <PlatformBadge host={contest.host} />
                    {getPlatform(contest.host).name}
                    {index === 0 && <span className="next-label">NEXT UP</span>}
                  </span>
                  <h2>{contest.event}</h2>
                  <time dateTime={start.toISOString()}>
                    {start.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </time>
                  {index === 0 && (
                    <div className="schedule-countdown">
                      <CountdownTimer startTime={contest.start} />
                    </div>
                  )}
                </div>
                <ArrowUpRight
                  className="schedule-entry-arrow"
                  size={19}
                  aria-hidden="true"
                />
              </a>
            );
          })
        ) : (
          <p className="schedule-unavailable">
            The schedule is being updated. Check the calendar for the latest
            rounds.
          </p>
        )}
        <Link href="/contests" className="schedule-all">
          Open the full calendar <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
export function ProductFeatures() {
  const features = [
    {
      title: "Save it for later",
      description: "Build a shortlist of contests you want to enter.",
      icon: Bookmark,
      href: "/bookmarks",
      label: "Open bookmarks",
      preview: "Your next rounds, together",
      detail: "A shortlist that stays with you",
    },
    {
      title: "Get a heads-up",
      description: "Email reminders, 1, 6, or 24 hours before the start.",
      icon: Bell,
      href: "/reminders",
      label: "Manage reminders",
      preview: "One less thing to remember",
      detail: "Choose when we remind you",
    },
    {
      title: "Put a face to your handle",
      description: "Add your photo, coding handles, and social links.",
      icon: UserRound,
      href: "/profile",
      label: "Edit your profile",
      preview: "The person behind the code",
      detail: "Your profiles, in one place",
    },
  ];
  return (
    <section className="personal-section" aria-labelledby="personal-title">
      <div className="section-heading">
        <div>
          <p className="discovery-kicker">MAKE IT YOURS</p>
          <h2 id="personal-title" className="section-title">
            Found a round? Keep it close.
          </h2>
        </div>
        <p className="personal-note">
          Sign in to save contests and set reminders.
        </p>
      </div>
      <div className="personal-grid">
        {features.map(
          (
            { title, description, icon: Icon, href, label, preview, detail },
            index,
          ) => (
            <Reveal key={href} delay={index * 0.06}>
              <Link href={href} className="personal-card">
                <div className="personal-preview" aria-hidden="true">
                  <div className="personal-preview-icon">
                    <Icon size={23} />
                  </div>
                  <div>
                    <strong>{preview}</strong>
                    <span>{detail}</span>
                  </div>
                  <span className="personal-preview-dot" />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="text-link">
                  {label}
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ),
        )}
      </div>
    </section>
  );
}
