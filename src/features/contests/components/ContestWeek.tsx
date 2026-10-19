"use client";

import { ArrowUpRight, CalendarDays, X } from "lucide-react";
import type { Contest } from "@/features/contests/types";
import {
  getCalendarWeek,
  getContestDay,
} from "@/features/contests/lib/calendar";

export default function ContestWeek({
  contests,
  today,
  selectedDate = "",
  onSelectDate,
}: {
  contests: Contest[];
  today: string;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}) {
  const days = getCalendarWeek(today);
  return (
    <section className="week-strip" aria-label="Explore the next seven days">
      <div className="week-strip-heading">
        <div>
          <CalendarDays size={16} aria-hidden="true" />
          <h2>Your week at a glance</h2>
          <span>IST / UTC +5:30</span>
        </div>
        {selectedDate ? (
          <button onClick={() => onSelectDate("")}>
            Show all dates <X size={13} aria-hidden="true" />
          </button>
        ) : (
          <p>
            Pick a day to explore <ArrowUpRight size={13} aria-hidden="true" />
          </p>
        )}
      </div>
      <div
        className="week-strip-days"
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
              className="week-strip-day"
              aria-pressed={selectedDate === day.key}
              aria-label={
                day.fullLabel +
                ", " +
                count +
                " contest" +
                (count === 1 ? "" : "s")
              }
              onClick={() =>
                onSelectDate(selectedDate === day.key ? "" : day.key)
              }
            >
              <span className="week-strip-date">
                <span>{day.label}</span>
                <strong>{day.day}</strong>
              </span>
              <span className="week-strip-count">
                <i aria-hidden="true" />
                {count}
                <span className="sr-only"> contests</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
