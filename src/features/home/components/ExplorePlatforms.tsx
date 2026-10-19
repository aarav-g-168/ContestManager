import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Contest } from "@/features/contests/types";
import type { CSSProperties } from "react";
import { getPlatform, getPlatformKey } from "@/features/contests/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import { PlatformBadge } from "@/features/contests/components/ContestCard";

export default function ExplorePlatforms({
  contests,
}: {
  contests: Contest[];
}) {
  const hosts = Array.from(
    new Set(contests.map((contest) => getPlatformKey(contest.host))),
  );
  const preferred = [
    "codeforces.com",
    "leetcode.com",
    "atcoder.jp",
    "codechef.com",
  ];
  const platforms = [
    ...preferred.filter((host) => hosts.includes(host)),
    ...hosts.filter((host) => !preferred.includes(host)),
  ].slice(0, 4);
  if (!platforms.length) return null;
  return (
    <section
      className="platform-explore"
      aria-labelledby="platform-explore-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow section-label">FIND YOUR PLATFORM</p>
          <h2 id="platform-explore-title" className="section-title">
            Same calendar. Different challenges.
          </h2>
        </div>
        <Link href="/contests" className="text-link">
          Explore the calendar <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <div className="platform-tiles">
        {platforms.map((host, index) => {
          const events = contests.filter(
            (contest) => getPlatformKey(contest.host) === host,
          );
          const next = [...events].sort(
            (a, b) =>
              parseAsUTC(a.start).getTime() - parseAsUTC(b.start).getTime(),
          )[0];
          return (
            <Link
              key={host}
              href={`/contests?platform=${encodeURIComponent(host)}`}
              className="platform-tile"
              style={
                { "--tile-color": getPlatform(host).color } as CSSProperties
              }
            >
              <span className="platform-watermark" aria-hidden="true">
                {getPlatform(host).mark}
              </span>
              <div className="platform-tile-top">
                <PlatformBadge host={host} />
                <span className="platform-tile-index">0{index + 1}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </div>
              <h3>{getPlatform(host).name}</h3>
              <span className="platform-event-count">
                {events.length} upcoming contest{events.length === 1 ? "" : "s"}
              </span>
              <p>{next.event}</p>
              <time dateTime={parseAsUTC(next.start).toISOString()}>
                {parseAsUTC(next.start).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Kolkata",
                })}
                <span>
                  View contests <ArrowRight size={13} aria-hidden="true" />
                </span>
              </time>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
