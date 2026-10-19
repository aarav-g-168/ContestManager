"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Contest } from "@/features/contests/types";
import { getPlatformKey } from "@/features/contests/lib/platforms";
import { sortContests } from "@/features/contests/lib/utils";
import ContestClientComponent from "@/features/contests/components/ContestBrowser";
const tabs = [
  { id: "all", label: "All platforms" },
  { id: "codeforces.com", label: "Codeforces" },
  { id: "leetcode.com", label: "LeetCode" },
  { id: "atcoder.jp", label: "AtCoder" },
  { id: "codechef.com", label: "CodeChef" },
];
export default function HomeDiscovery({ contests }: { contests: Contest[] }) {
  const [platform, setPlatform] = useState("all");
  const reduced = useReducedMotion();
  const matches = sortContests(
    contests.filter(
      (contest) =>
        platform === "all" || getPlatformKey(contest.host) === platform,
    ),
  );
  return (
    <>
      <div className="home-browse-heading">
        <div
          className="home-platform-tabs"
          role="group"
          aria-label="Preview contests by platform"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              aria-pressed={platform === tab.id}
              onClick={() => setPlatform(tab.id)}
            >
              {platform === tab.id && (
                <motion.span
                  className="home-tab-active"
                  layoutId="home-platform"
                  transition={{ duration: reduced ? 0 : 0.2 }}
                />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <span role="status" className="home-result-count">
          {matches.length} upcoming
        </span>
      </div>
      <ContestClientComponent initialContests={matches.slice(0, 6)} />
      <Link
        href={
          platform === "all"
            ? "/contests"
            : `/contests?platform=${encodeURIComponent(platform)}`
        }
        className="discovery-more"
      >
        {matches.length > 6
          ? `See all ${matches.length} contests`
          : "Explore the full calendar"}
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </>
  );
}
