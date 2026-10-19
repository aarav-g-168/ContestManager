"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react";
import type { Contest } from "@/features/contests/types";
import { getPlatform, getPlatformKey } from "@/features/contests/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import CountdownTimer from "@/features/contests/components/CountdownTimer";
import { PlatformBadge } from "@/features/contests/components/ContestCard";

export default function FeaturedRound({ contests }: { contests: Contest[] }) {
  const preferred = [
    "codeforces.com",
    "leetcode.com",
    "atcoder.jp",
    "codechef.com",
  ];
  const seen = new Set<string>();
  const sorted = [...contests].sort(
    (a, b) => parseAsUTC(a.start).getTime() - parseAsUTC(b.start).getTime(),
  );
  const rounds = sorted
    .filter((contest) => {
      const host = getPlatformKey(contest.host);
      if (!preferred.includes(host) || seen.has(host)) return false;
      seen.add(host);
      return true;
    })
    .slice(0, 3);
  const [selected, setSelected] = useState(0);
  const round = rounds[selected] ?? rounds[0] ?? sorted[0];
  const platform = round ? getPlatform(round.host) : null;
  const start = round ? parseAsUTC(round.start) : null;
  return (
    <section className="featured-round" aria-label="Upcoming round preview">
      <div className="featured-topline">
        <span>
          <span className="status-dot" /> On the schedule
        </span>
        <span className="featured-index">ROUND / 0{selected + 1}</span>
      </div>
      {rounds.length > 1 && (
        <div
          className="featured-tabs"
          role="group"
          aria-label="Preview a platform’s next contest"
        >
          {rounds.map((item, index) => (
            <button
              key={item.id}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {getPlatform(item.host).name}
            </button>
          ))}
        </div>
      )}
      {round && platform && start ? (
        <div className="featured-body" key={round.id}>
          <div className="featured-platform">
            <PlatformBadge host={round.host} />
            <span>Next on {platform.name}</span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </div>
          <h2>
            <a
              href={round.href}
              title={round.event}
              target="_blank"
              rel="noreferrer"
              aria-label={`${round.event} (opens in a new tab)`}
            >
              {round.event}
            </a>
          </h2>
          <p className="featured-start">
            <Clock3 size={14} aria-hidden="true" />
            <time dateTime={start.toISOString()}>
              {start.toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
                hour12: true,
              })}
            </time>{" "}
            <span>IST</span>
          </p>
          <div className="featured-timer">
            <p>Starts in</p>
            <CountdownTimer startTime={round.start} expanded />
          </div>
          <Link
            className="featured-cta"
            href={`/contests?platform=${encodeURIComponent(getPlatformKey(round.host))}`}
          >
            Explore {platform.name} contests{" "}
            <span>
              <ArrowRight size={17} aria-hidden="true" />
            </span>
          </Link>
        </div>
      ) : (
        <div className="featured-body">
          <h2>Your next round is out there.</h2>
          <p className="featured-start">
            Browse the calendar for newly announced contests.
          </p>
          <Link href="/contests" className="featured-cta">
            Explore contests <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className="featured-bottomline">
        <span>START TIMES IN IST / UTC +5:30</span>
        <span aria-hidden="true">↗</span>
      </div>
    </section>
  );
}
