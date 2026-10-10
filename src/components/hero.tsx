"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Code2,
  UserRound,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { getPlatformKey } from "@/lib/platforms";
import { Magnet, Reveal } from "./ui/interaction";
import FeaturedRound from "./FeaturedRound";

export default function HeroSection({ contests }: { contests: Contest[] }) {
  const platformCount = new Set(
    contests.map((contest) => getPlatformKey(contest.host)),
  ).size;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="hero-copy reveal">
          <p className="hero-kicker">
            <span aria-hidden="true">{"//"}</span> THE COMPETITIVE PROGRAMMING
            CALENDAR
          </p>
          <h1 id="hero-title" className="hero-title">
            Your next round
            <br />
            <em>starts here.</em>
            <span className="hero-period" aria-hidden="true">
              _
            </span>
          </h1>
          <p className="hero-description">
            Find contests across Codeforces, LeetCode, AtCoder and more. Save
            the rounds you want to enter and get an email before they start.
          </p>
          <div className="hero-actions">
            <Magnet>
              <Link href="/contests" className="btn-primary">
                Explore contests <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </Magnet>
            <a href="#explore-platforms" className="text-link">
              Find your platform <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
          <div className="hero-note">
            <span className="hero-note-line" aria-hidden="true" />
            Free to browse. Sign in to save your rounds.
          </div>
        </div>
        <div className="hero-art reveal" style={{ animationDelay: ".1s" }}>
          <FeaturedRound contests={contests} />
        </div>
      </div>
      <div className="hero-ledger">
        <div className="hero-ledger-label">
          <Code2 size={22} strokeWidth={1.5} aria-hidden="true" />
          <span>
            The calendar
            <br />
            <strong>At a glance.</strong>
          </span>
        </div>
        <dl className="hero-facts">
          <div>
            <dt>Next 30 days</dt>
            <dd>
              {contests.length}
              <span>contests ahead</span>
            </dd>
          </div>
          <div>
            <dt>One calendar</dt>
            <dd>
              {platformCount}
              <span>platforms</span>
            </dd>
          </div>
          <div>
            <dt>Every start time, local</dt>
            <dd>
              IST<span>UTC +5:30</span>
            </dd>
          </div>
        </dl>
        <a
          href="#contests"
          className="ledger-explore"
          aria-label="See this week’s contests"
        >
          <ArrowDown size={19} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export function ProductFeatures() {
  const features = [
    {
      title: "Keep a shortlist.",
      description:
        "Save the rounds you want to enter. Find them here, on any device.",
      icon: Bookmark,
      href: "/bookmarks",
      label: "Your bookmarks",
      style: "saved",
    },
    {
      title: "Be there at the start.",
      description:
        "Get an email 1, 6, or 24 hours before a contest. You choose when.",
      icon: Bell,
      href: "/reminders",
      label: "Your reminders",
      style: "reminder",
    },
    {
      title: "Make it your space.",
      description:
        "Your coding handles, bio, and links. A familiar place to come back to.",
      icon: UserRound,
      href: "/profile",
      label: "Your profile",
      style: "profile",
    },
  ];
  return (
    <section id="your-workspace" className="section-space workspace-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow section-label">
            <span>03 /</span> YOUR WORKSPACE
          </p>
          <h2 className="section-title">A calendar that’s yours.</h2>
        </div>
        <p className="section-aside">
          Sign in once. Keep your contests,
          <br className="hidden sm:block" /> reminders, and profile together.
        </p>
      </div>
      <div className="workspace-grid">
        {features.map(
          ({ title, description, icon: Icon, href, label, style }, index) => (
            <Reveal key={href} delay={index * 0.06}>
              <Link className={"workspace-card workspace-" + style} href={href}>
                <div className="workspace-visual" aria-hidden="true">
                  <span className="workspace-orbit" />
                  <span className="workspace-orbit" />
                  <span className="workspace-symbol">
                    <Icon size={30} strokeWidth={1.35} />
                  </span>
                  <span className="workspace-mini-mark">0{index + 1}</span>
                </div>
                <div className="workspace-card-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="text-link">
                    {label}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ),
        )}
      </div>
    </section>
  );
}
