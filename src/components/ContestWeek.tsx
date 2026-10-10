"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import { getCalendarWeek, getContestDay } from "@/lib/contestCalendar";
import { getPlatform } from "@/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import CountdownTimer from "./countdownTimer";

export default function ContestWeek({
  contests,
  today,
  selectedDate,
  onSelectDate,
}: {
  contests: Contest[];
  today: string;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}) {
  const days = getCalendarWeek(today);
  const [activeDay, setActiveDay] = useState(
    () =>
      days.find((day) =>
        contests.some((contest) => getContestDay(contest.start) === day.key),
      )?.key ?? today,
  );
  const currentDay = selectedDate || activeDay;
  const dailyContests = contests.filter(
    (contest) => getContestDay(contest.start) === currentDay,
  );
  const featured = dailyContests[0];
  const selectedLabel = new Date(`${currentDay}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
  return (
    <section
      className={`week-board ${onSelectDate ? "week-board-browse" : ""}`}
      aria-label="Explore the next seven days"
    >
      <div className="week-picker">
        <div className="week-heading">
          <div>
            <p className="week-kicker">
              <CalendarDays size={14} aria-hidden="true" /> The next 7 days
            </p>
            <h2>This week’s contests</h2>
          </div>
          <span className="week-timezone">IST</span>
        </div>
        <div
          className="week-days"
          role="group"
          aria-label="Choose a contest date"
        >
          {days.map((day) => {
            const count = contests.filter(
              (contest) => getContestDay(contest.start) === day.key,
            ).length;
            return (
              <button
                key={day.key}
                className="week-day"
                aria-pressed={currentDay === day.key}
                aria-label={`${day.fullLabel}, ${count} contest${count !== 1 ? "s" : ""}`}
                onClick={() => {
                  setActiveDay(day.key);
                  onSelectDate?.(day.key);
                }}
              >
                <span>{day.label}</span>
                <strong>{day.day}</strong>
                <span className="week-day-count">
                  {count}
                  <span className="sr-only"> contests</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="week-hint">Pick a day to see what’s coming up.</p>
      </div>
      <div className="week-feature" key={currentDay}>
        <div className="week-feature-meta">
          <span>
            {selectedLabel} <span aria-hidden="true">/</span>{" "}
            {dailyContests.length} contest
            {dailyContests.length !== 1 ? "s" : ""}
          </span>
          {featured && <CountdownTimer startTime={featured.start} />}
        </div>
        {featured ? (
          <>
            <p className="week-platform">
              {getPlatform(featured.host).name}
              <span>First start</span>
            </p>
            <h3>
              <a
                href={featured.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${featured.event} (opens in a new tab)`}
              >
                {featured.event}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </h3>
            <p className="week-start">
              <Clock3 size={14} aria-hidden="true" />
              {parseAsUTC(featured.start).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </p>
          </>
        ) : (
          <div className="week-empty">
            <h3>No contests on this day.</h3>
            <p>Try another date or browse the full calendar.</p>
          </div>
        )}
        <div className="week-feature-footer">
          {onSelectDate ? (
            <a
              href="#contest-results"
              className="week-link"
              onClick={() => onSelectDate(featured ? currentDay : "")}
            >
              {featured ? "Browse this day" : "Browse all contests"}{" "}
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          ) : (
            <Link
              href={featured ? `/contests?date=${currentDay}` : "/contests"}
              className="week-link"
            >
              {featured ? "Explore this day" : "View all contests"}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
          {onSelectDate && selectedDate ? (
            <button onClick={() => onSelectDate("")} className="week-clear">
              Show all dates
            </button>
          ) : (
            <span className="week-footnote">IST · UTC+5:30</span>
          )}
        </div>
      </div>
    </section>
  );
}
