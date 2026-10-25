"use client";
import { reminderTimeLabel } from "@/features/reminders/lib/timing";
import GettingStarted from "@/features/account/components/GettingStarted";
import WeekSkeleton from "@/features/week/components/WeekSkeleton";
import WeeklyGoals from "@/features/goals/components/WeeklyGoals";
import { useMemo, useRef, useState } from "react";
import ReminderChoices from "@/features/reminders/components/ReminderChoices";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  Bookmark,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  Mail,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { useProfile } from "@/features/profile/components/ProfileProvider";
import { useWeekPlan } from "@/features/week/hooks/useWeekPlan";
import { useClock } from "@/hooks/useClock";
import { accountRequest } from "@/features/auth/lib/client-api";
import { getGoogleCalendarLink } from "@/features/contests/lib/google-calendar";
import { getPlatform } from "@/features/contests/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import {
  reminderLabel,
  weekDuration,
  weekOverlaps,
  weekRounds,
  weekWindow,
  WEEK_TIMEZONE,
  type WeekItem,
  type WeekPlan,
  type WeekRound,
} from "@/features/week/lib/week";
import type { Contest } from "@/features/contests/types";
import { PlatformBadge } from "@/features/contests/components/ContestCard";
import CountdownTimer from "@/features/contests/components/CountdownTimer";
import AuthButton from "@/features/auth/components/AuthButton";
import { toast } from "sonner";
import "@/features/week/styles.css";

type Action = "bookmark" | "remove-reminder" | "15m" | "1h" | "3h";
type Props = {
  contests: Contest[];
  feedError: string | null;
  initialNow: number;
};
const time = (value: number | string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    timeZone: WEEK_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
const date = (value: number | string) =>
  new Date(value).toLocaleDateString("en-GB", {
    timeZone: WEEK_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const problem = (item: WeekItem) =>
  !!item.reminder &&
  ["failed", "bounced", "uncertain", "expired"].includes(item.reminder.status);

function RoundActions({
  item,
  now,
  busy,
  onAction,
}: {
  item: WeekItem;
  now: number;
  busy: boolean;
  onAction: (item: WeekItem, action: Action) => void;
}) {
  const start = parseAsUTC(item.contest.start).getTime();
  return (
    <div className="week-round-actions">
      <button
        className={`icon-button ${item.bookmarked ? "week-saved" : ""}`}
        disabled={busy}
        aria-pressed={item.bookmarked}
        aria-label={`${item.bookmarked ? "Remove bookmark for" : "Save"} ${item.contest.event}`}
        onClick={() => onAction(item, "bookmark")}
      >
        <Bookmark
          size={17}
          fill={item.bookmarked ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="icon-button"
            disabled={busy}
            aria-label={`Email reminder options for ${item.contest.event}`}
          >
            <Bell
              size={17}
              className={item.reminder ? "week-saved" : undefined}
              aria-hidden="true"
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl"
            sideOffset={8}
            align="end"
          >
            <DropdownMenu.Label className="eyebrow px-3 py-2">
              Email me before the start
            </DropdownMenu.Label>
            <ReminderChoices
              start={start}
              now={now}
              disabled={busy}
              selected={item.reminder?.type}
              onChoose={(type) => onAction(item, type)}
            />
            {item.reminder && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  className="menu-item text-destructive"
                  onSelect={() => onAction(item, "remove-reminder")}
                >
                  <BellOff size={15} aria-hidden="true" />
                  Remove email reminder
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <a
        className="icon-button"
        href={getGoogleCalendarLink(
          item.contest.event,
          item.contest.start,
          item.contest.duration,
          item.contest.href,
        )}
        target="_blank"
        rel="noreferrer"
        aria-label={`Add ${item.contest.event} to Google Calendar (opens in a new tab)`}
      >
        <CalendarPlus size={17} aria-hidden="true" />
      </a>
    </div>
  );
}

function WeekWelcome() {
  return (
    <div className="site-container week-page">
      <section className="week-welcome">
        <div>
          <p className="week-eyebrow">
            <CalendarDays size={16} aria-hidden="true" />
            YOUR WEEK, AT A GLANCE
          </p>
          <h1>
            A place for
            <br />
            your next rounds.
          </h1>
          <p>
            Save the contests you want to enter. See what’s next, check your
            reminders, and catch schedule overlaps before the week gets busy.
          </p>
          <AuthButton expanded />
          <Link href="/contests" className="text-link">
            Browse contests first <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="week-welcome-paper" aria-hidden="true">
          <div className="week-paper-heading">
            <CalendarDays size={20} />
            <span>MY WEEK</span>
          </div>
          <div className="week-paper-days">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <span key={i}>{day}</span>
            ))}
          </div>
          <div className="week-paper-note">
            <Bookmark size={20} />
            <span>Your saved rounds</span>
          </div>
          <div className="week-paper-note">
            <Bell size={20} />
            <span>Your email reminders</span>
          </div>
          <div className="week-paper-note">
            <Clock3 size={20} />
            <span>A schedule that makes sense</span>
          </div>
          <div className="week-paper-footer">
            A little planning goes a long way.
          </div>
        </div>
      </section>
    </div>
  );
}

type ViewProps = {
  gettingStarted?: React.ReactNode;
  goals?: React.ReactNode;
  plan: WeekPlan;
  contests: Contest[];
  now: number;
  feedError: string | null;
  name: string;
  error: string | null;
  refreshing: boolean;
  busyId: number | null;
  onRefresh: () => void;
  onAction: (item: WeekItem, action: Action) => void;
};
export function MyWeekView({
  gettingStarted,
  plan,
  contests,
  now,
  feedError,
  name,
  error,
  refreshing,
  busyId,
  onRefresh,
  onAction,
  goals,
}: ViewProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const window = weekWindow(now);
  const activeDay = window.days.some((day) => day.key === selected)
    ? selected
    : null;
  const rounds = useMemo(
    () => weekRounds(plan.items, contests, now),
    [plan.items, contests, now],
  );
  const overlaps = useMemo(() => weekOverlaps(rounds, now), [rounds, now]);
  const conflictIds = new Set(
    overlaps.flatMap((pair) => [pair.first.contest.id, pair.second.contest.id]),
  );
  const next = rounds[0];
  const visible = activeDay
    ? rounds.filter((round) => round.day === activeDay)
    : rounds;
  const scheduled = rounds.filter(
    (round) => round.reminder?.status === "scheduled",
  );
  const emails = rounds
    .filter((round) => !!round.reminder)
    .sort(
      (a, b) => Date.parse(a.reminder!.dueAt) - Date.parse(b.reminder!.dueAt),
    );
  const suggestions = contests
    .filter((contest) => {
      const start = parseAsUTC(contest.start).getTime();
      return (
        start > now &&
        start < window.end &&
        !plan.items.some((item) => item.contest.id === contest.id)
      );
    })
    .sort(
      (a, b) => parseAsUTC(a.start).getTime() - parseAsUTC(b.start).getTime(),
    )
    .slice(0, 3);
  const fresh = new Map(contests.map((contest) => [contest.id, contest]));
  const outside = plan.items.filter(
    (item) =>
      parseAsUTC(
        (fresh.get(item.contest.id) ?? item.contest).start,
      ).getTime() >= window.end,
  ).length;
  const missing = rounds.filter((round) => !round.reminder).length;
  const pending = rounds.filter(
    (round) => round.reminder?.status === "pending",
  ).length;
  const issues = rounds.filter(
    (round) => problem(round) || round.scheduleChanged,
  );
  return (
    <div className="site-container week-page">
      <header className="week-heading">
        <div>
          <p className="week-eyebrow">
            YOUR WORKSPACE <span>/</span> NEXT 7 DAYS
          </p>
          <h1>
            My week<span>.</span>
          </h1>
          <p>{name ? `${name}, here’s` : "Here’s"} what’s on your schedule.</p>
        </div>
        <div className="week-heading-tools">
          <span>
            {date(window.start)} — {date(window.end - 1)}
          </span>
          <button
            className="btn-secondary"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>
      {gettingStarted}
      <nav className="week-quick-links" aria-label="Manage your week">
        <Link href="/journal?view=practice">
          To practise <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <Link href="/bookmarks">
          <Bookmark size={16} aria-hidden="true" />
          Saved contests
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <Link href="/reminders">
          <Bell size={16} aria-hidden="true" />
          Email reminders
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </nav>
      {error && (
        <div role="alert" className="week-notice">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>{error} Showing your last loaded plan.</p>
          <button
            className="text-link"
            onClick={onRefresh}
            disabled={refreshing}
          >
            Retry
          </button>
        </div>
      )}
      {feedError && (
        <div role="status" className="week-notice">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>
            The live contest feed is unavailable. Your saved schedule is still
            here; start times may have changed.
          </p>
        </div>
      )}
      <div className="week-top-grid">
        <section className="week-next" aria-labelledby="week-next-title">
          <div className="week-next-top">
            <span className="week-eyebrow">
              <span className="week-status-dot" />
              {next?.live ? "IN PROGRESS" : "YOUR NEXT ROUND"}
            </span>
            <span className="week-index" aria-hidden="true">
              {next ? "01" : "00"}
            </span>
          </div>
          {next ? (
            <>
              <div className="week-next-platform">
                <PlatformBadge host={next.contest.host} />
                {getPlatform(next.contest.host).name}
                {conflictIds.has(next.contest.id) && (
                  <a href="#week-conflicts" className="week-overlap-tag">
                    <TriangleAlert size={13} aria-hidden="true" />
                    Overlaps another round
                  </a>
                )}
              </div>
              <h2 id="week-next-title">{next.contest.event}</h2>
              <p className="week-next-meta">
                <CalendarDays size={16} aria-hidden="true" />
                {date(next.start)} · {time(next.start)} IST
                <span>· {weekDuration(next.contest.duration)}</span>
              </p>
              {next.live ? (
                <p className="week-live-note">
                  This round is underway. Ends at {time(next.end)} IST.
                </p>
              ) : (
                <CountdownTimer startTime={next.contest.start} expanded />
              )}
              <div className="week-next-bottom">
                <a
                  className="btn-primary"
                  href={next.contest.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {next.live ? "Join contest" : "Open contest"}
                  <ArrowUpRight size={17} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <a className="text-link" href="#week-agenda">
                  View my schedule <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
            </>
          ) : (
            <>
              <h2 id="week-next-title">Room for a good round.</h2>
              <p className="week-empty-copy">
                {outside
                  ? `You have ${outside} saved round${outside === 1 ? "" : "s"} after this week. Find something closer, or enjoy the space.`
                  : "Nothing saved for the next seven days. Find a contest you like and bookmark it to start your plan."}
              </p>
              <Link className="btn-primary" href="/contests">
                Find a contest <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </>
          )}
        </section>
        <section
          className="week-plan-summary"
          aria-labelledby="week-summary-title"
        >
          <p className="week-eyebrow" id="week-summary-title">
            THE WEEK IN NUMBERS
          </p>
          <div className="week-stat">
            <span>
              <Bookmark size={18} aria-hidden="true" />
              Saved rounds<small>Bookmarked or with a reminder</small>
            </span>
            <strong>{rounds.length.toString().padStart(2, "0")}</strong>
          </div>
          <div className="week-stat">
            <span>
              <Mail size={18} aria-hidden="true" />
              Emails scheduled
              <small>
                {pending
                  ? `${pending} more being scheduled`
                  : "Confirmed by the email provider"}
              </small>
            </span>
            <strong>{scheduled.length.toString().padStart(2, "0")}</strong>
          </div>
          <a className="week-stat week-stat-link" href="#week-conflicts">
            <span>
              <Clock3 size={18} aria-hidden="true" />
              Schedule overlaps
              <small>
                {overlaps.length
                  ? "Check the rounds that clash"
                  : "Between your saved rounds"}
              </small>
            </span>
            <strong>{overlaps.length.toString().padStart(2, "0")}</strong>
          </a>
          <p className="week-summary-foot">
            <CalendarDays size={14} aria-hidden="true" />
            All times IST · UTC+5:30
          </p>
        </section>
      </div>
      {goals}
      <section className="week-practice" aria-labelledby="week-practice-title">
        <div className="week-section-top">
          <div>
            <p className="week-eyebrow">BETWEEN THE ROUNDS</p>
            <h2 id="week-practice-title">Practice this week</h2>
          </div>
          <Link className="text-link" href="/journal?view=practice">
            Open queue <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {plan.practice?.items.length ? (
          <ul>
            {plan.practice.items.slice(0, 6).map((item) => (
              <li key={`${item.entryId}:${item.problem.id}`}>
                <time dateTime={item.problem.plannedDate}>
                  {new Date(
                    `${item.problem.plannedDate}T00:00:00Z`,
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </time>
                <div>
                  <strong>{item.problem.title}</strong>
                  <span>{item.contest}</span>
                </div>
                <Link
                  className="text-link"
                  href={`/journal?view=practice&planned=${item.problem.plannedDate}`}
                >
                  View plan <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No practice planned yet. Give a journal problem a date to see it
            here.
          </p>
        )}
        {plan.practice &&
          (plan.practice.more || plan.practice.items.length > 6) && (
            <p>
              Showing your next six planned problems. Open your queue to see the
              rest.
            </p>
          )}
        <small>Dates use IST. Practice plans don’t send email reminders.</small>
      </section>
      <section className="week-calendar" aria-labelledby="week-calendar-title">
        <div className="week-section-top">
          <h2 id="week-calendar-title">Your next seven days</h2>
          <button
            className="week-reset"
            aria-pressed={!activeDay}
            onClick={() => setSelected(null)}
          >
            All 7 days <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
        <div
          className="week-days"
          role="group"
          aria-label="Filter your schedule by day"
        >
          {window.days.map((day, i) => {
            const daily = rounds.filter((round) => round.day === day.key);
            const clash = daily.some((round) =>
              conflictIds.has(round.contest.id),
            );
            return (
              <button
                key={day.key}
                className="week-day"
                data-today={i === 0}
                aria-pressed={activeDay === day.key}
                aria-label={`${day.fullLabel}: ${daily.length} saved round${daily.length === 1 ? "" : "s"}${clash ? ", schedule overlap" : ""}`}
                onClick={() =>
                  setSelected(activeDay === day.key ? null : day.key)
                }
              >
                <span>{day.label}</span>
                <strong>{day.day.toString().padStart(2, "0")}</strong>
                <div className="week-day-markers" aria-hidden="true">
                  {daily.slice(0, 4).map((round) => (
                    <i
                      key={round.contest.id}
                      data-clash={conflictIds.has(round.contest.id)}
                    />
                  ))}
                </div>
                <small>
                  {daily.length
                    ? `${daily.length} round${daily.length === 1 ? "" : "s"}`
                    : "Open day"}
                  {clash && <TriangleAlert size={12} aria-hidden="true" />}
                </small>
              </button>
            );
          })}
        </div>
      </section>
      <div className="week-content-grid">
        <section id="week-agenda" aria-labelledby="week-agenda-title">
          <div className="week-section-top">
            <div>
              <p className="week-eyebrow">YOUR SAVED ROUNDS</p>
              <h2 id="week-agenda-title">
                {activeDay
                  ? date(`${activeDay}T00:00:00+05:30`)
                  : "Your schedule"}
              </h2>
            </div>
            <span className="week-subtle-count" role="status">
              {visible.length} round{visible.length === 1 ? "" : "s"}
            </span>
          </div>
          {visible.length ? (
            window.days
              .filter((day) => !activeDay || day.key === activeDay)
              .map((day) => {
                const daily = visible.filter((round) => round.day === day.key);
                return daily.length ? (
                  <section
                    className="week-agenda-day"
                    key={day.key}
                    aria-label={day.fullLabel}
                  >
                    <div className="week-agenda-date">
                      <span>
                        {day.key === window.today ? "Today" : day.label}
                      </span>
                      <span>{date(`${day.key}T00:00:00+05:30`)}</span>
                    </div>
                    {daily.map((round) => (
                      <RoundRow
                        key={round.contest.id}
                        round={round}
                        conflict={conflictIds.has(round.contest.id)}
                        now={now}
                        busy={busyId === round.contest.id}
                        onAction={onAction}
                      />
                    ))}
                  </section>
                ) : null;
              })
          ) : (
            <div className="week-agenda-empty">
              <CalendarDays size={28} aria-hidden="true" />
              <h3>
                {activeDay
                  ? "An open day."
                  : "Your schedule starts with a save."}
              </h3>
              <p>
                {activeDay
                  ? "No saved rounds on this day. Check the calendar for something to enter."
                  : "Bookmark a contest or set a reminder. It’ll appear here automatically."}
              </p>
              <Link
                className="text-link"
                href={activeDay ? `/contests?date=${activeDay}` : "/contests"}
              >
                Find a round <ArrowRight size={15} aria-hidden="true" />
              </Link>
              {activeDay && (
                <button
                  className="week-reset"
                  onClick={() => setSelected(null)}
                >
                  Back to all 7 days
                </button>
              )}
            </div>
          )}
          {outside > 0 && (
            <div className="week-outside">
              <span>
                {outside} saved round{outside === 1 ? "" : "s"} after this week
              </span>
              <Link href="/bookmarks">
                Bookmarks <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link href="/reminders">
                Reminders <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
        <aside className="week-sidebar">
          <section
            className="week-side-card"
            aria-labelledby="week-email-title"
          >
            <div className="week-side-heading">
              <span className="week-side-icon">
                <Bell size={18} aria-hidden="true" />
              </span>
              <h2 id="week-email-title">Email reminders</h2>
            </div>
            <p className="week-side-description">
              Email reminders for your saved rounds this week.
            </p>
            {emails.length ? (
              <ul className="week-email-list">
                {emails.slice(0, 4).map((round) => (
                  <li key={round.contest.id}>
                    <strong>{round.contest.event}</strong>
                    <span
                      className={
                        problem(round) || round.scheduleChanged
                          ? "week-warning"
                          : ""
                      }
                    >
                      {round.scheduleChanged
                        ? "Schedule changed — review reminder"
                        : reminderLabel(round)}
                    </span>
                    <small>
                      {["scheduled", "pending"].includes(round.reminder!.status)
                        ? `Due ${date(round.reminder!.dueAt)} · ${time(round.reminder!.dueAt)} IST`
                        : `Requested ${reminderTimeLabel(round.reminder!.type)} before start`}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="week-side-empty">
                No email reminders yet. Use the bell beside a round to choose 1,
                6, or 24 hours before its start.
              </p>
            )}
            {missing > 0 && (
              <p className="week-reminder-note">
                {missing} saved round{missing === 1 ? " has" : "s have"} no
                email reminder.
              </p>
            )}
            {issues.length > 0 && (
              <p className="week-warning">
                {issues.length} reminder
                {issues.length === 1 ? " needs" : "s need"} a look.
              </p>
            )}
            <Link href="/reminders" className="text-link">
              Manage reminders <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </section>
          <section
            id="week-conflicts"
            className="week-side-card"
            aria-labelledby="week-conflicts-title"
          >
            <div className="week-side-heading">
              <span className="week-side-icon">
                {overlaps.length ? (
                  <TriangleAlert size={18} aria-hidden="true" />
                ) : (
                  <Check size={18} aria-hidden="true" />
                )}
              </span>
              <h2 id="week-conflicts-title">
                {overlaps.length ? "Schedule overlaps" : "No overlaps"}
              </h2>
            </div>
            {overlaps.length ? (
              <>
                <p className="week-side-description">
                  These saved rounds run at the same time. You decide which one
                  to enter.
                </p>
                <ul className="week-overlap-list">
                  {overlaps.slice(0, 3).map((pair) => (
                    <li
                      key={`${pair.first.contest.id}-${pair.second.contest.id}`}
                    >
                      <span>
                        {pair.minutes} min overlap ·{" "}
                        {date(
                          Math.max(pair.first.start, pair.second.start, now),
                        )}
                      </span>
                      <p>{pair.first.contest.event}</p>
                      <small>overlaps</small>
                      <p>{pair.second.contest.event}</p>
                    </li>
                  ))}
                </ul>
                {overlaps.length > 3 && (
                  <details className="week-more-overlaps">
                    <summary>
                      {overlaps.length - 3} more overlapping pairs
                    </summary>
                    {overlaps.slice(3).map((pair) => (
                      <p
                        key={`${pair.first.contest.id}-${pair.second.contest.id}`}
                      >
                        {pair.first.contest.event} / {pair.second.contest.event}{" "}
                        · {pair.minutes} min
                      </p>
                    ))}
                  </details>
                )}
              </>
            ) : (
              <p className="week-side-empty">
                {rounds.length > 1
                  ? "Your saved rounds don’t overlap. One less thing to figure out."
                  : "Overlapping rounds will show up here as you build your week."}
              </p>
            )}
            <p className="week-fine-print">
              Based on listed start times and durations. Rounds with an unknown
              duration aren’t checked.
            </p>
          </section>
        </aside>
      </div>
      {!feedError && suggestions.length > 0 && (
        <section
          className="week-discover"
          aria-labelledby="week-discover-title"
        >
          <div className="week-section-top">
            <div>
              <p className="week-eyebrow">ON THE CALENDAR</p>
              <h2 id="week-discover-title">
                {rounds.length
                  ? "A few more to consider"
                  : "Pick your first round"}
              </h2>
              <p>Upcoming this week. Save one to add it to your plan.</p>
            </div>
            <Link href="/contests" className="text-link">
              Browse all <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="week-suggestions">
            {suggestions.map((contest) => (
              <article key={contest.id}>
                <span className="week-suggestion-platform">
                  <PlatformBadge host={contest.host} />
                  {getPlatform(contest.host).name}
                </span>
                <h3>
                  <a
                    href={contest.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${contest.event} (opens in a new tab)`}
                  >
                    {contest.event}
                  </a>
                </h3>
                <p>
                  {date(parseAsUTC(contest.start).getTime())} ·{" "}
                  {time(parseAsUTC(contest.start).getTime())} IST
                </p>
                <button
                  className="btn-secondary"
                  disabled={busyId === contest.id}
                  onClick={() =>
                    onAction(
                      { contest, bookmarked: false, reminder: null },
                      "bookmark",
                    )
                  }
                >
                  <Plus size={15} aria-hidden="true" />
                  {busyId === contest.id ? "Saving…" : "Save to my week"}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer className="week-footer">
        <span>
          {refreshing
            ? "Updating your plan…"
            : `Plan updated ${time(plan.asOf)} IST`}
        </span>
        <span>Saved rounds only · Times in IST</span>
      </footer>
    </div>
  );
}

function RoundRow({
  round,
  conflict,
  now,
  busy,
  onAction,
}: {
  round: WeekRound;
  conflict: boolean;
  now: number;
  busy: boolean;
  onAction: ViewProps["onAction"];
}) {
  return (
    <article
      className="week-round"
      id={`week-round-${round.contest.id}`}
      aria-busy={busy}
    >
      <div className="week-round-time">
        <time dateTime={new Date(round.start).toISOString()}>
          {time(round.start)}
        </time>
        <span>
          {round.live ? "Live now" : weekDuration(round.contest.duration)}
        </span>
      </div>
      <div className="week-round-main">
        <div className="week-round-platform">
          <PlatformBadge host={round.contest.host} />
          <span>{getPlatform(round.contest.host).name}</span>
          {conflict && (
            <a href="#week-conflicts" className="week-overlap-tag">
              <TriangleAlert size={12} aria-hidden="true" />
              Overlap
            </a>
          )}
        </div>
        <h3>
          <a
            href={round.contest.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${round.contest.event} (opens in a new tab)`}
          >
            {round.contest.event}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </h3>
        <p
          className={
            problem(round) || round.scheduleChanged ? "week-warning" : ""
          }
        >
          <Mail size={13} aria-hidden="true" />
          {round.scheduleChanged
            ? "Start time changed — review your reminder"
            : reminderLabel(round)}
        </p>
        <RoundActions item={round} now={now} busy={busy} onAction={onAction} />
      </div>
    </article>
  );
}

export default function MyWeek({ contests, feedError, initialNow }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const state = useWeekPlan();
  const now = useClock() ?? initialNow;
  const [busyId, setBusyId] = useState<number | null>(null);
  const actionLock = useRef(false);
  async function action(item: WeekItem, type: Action) {
    if (!user || actionLock.current) return;
    actionLock.current = true;
    setBusyId(item.contest.id);
    try {
      if (type === "bookmark")
        await accountRequest(
          user,
          item.bookmarked
            ? `/api/bookmarks?contestId=${item.contest.id}`
            : "/api/bookmarks",
          {
            method: item.bookmarked ? "DELETE" : "PUT",
            ...(!item.bookmarked
              ? { body: JSON.stringify({ contestId: item.contest.id }) }
              : {}),
          },
        );
      else if (type === "remove-reminder")
        await accountRequest(
          user,
          `/api/reminders?contestId=${item.contest.id}`,
          { method: "DELETE" },
        );
      else
        await accountRequest(user, "/api/reminders", {
          method: "PUT",
          body: JSON.stringify({
            contestId: item.contest.id,
            reminderType: type,
          }),
        });
      await state.refresh();
      toast.success(
        type === "bookmark"
          ? item.bookmarked
            ? "Bookmark removed."
            : "Saved to your week."
          : type === "remove-reminder"
            ? "Cancellation requested. Emails already sent can’t be recalled."
            : "Reminder saved. Confirming the email schedule.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t update your plan.",
      );
    } finally {
      actionLock.current = false;
      setBusyId(null);
    }
  }
  if (authLoading) return <WeekSkeleton />;
  if (!user) return <WeekWelcome />;
  if (state.loading || (!state.data && !state.error)) return <WeekSkeleton />;
  if (!state.data)
    return (
      <div className="site-container week-page">
        <div className="week-agenda-empty" role="alert">
          <TriangleAlert size={28} aria-hidden="true" />
          <h1>Your week couldn’t load.</h1>
          <p>{state.error}</p>
          <button
            className="btn-secondary"
            disabled={state.refreshing}
            onClick={() => void state.refresh()}
          >
            Try again <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  return (
    <MyWeekView
      plan={state.data}
      goals={<WeeklyGoals />}
      gettingStarted={<GettingStarted />}
      contests={contests}
      now={now}
      feedError={feedError}
      name={
        (profile?.values.displayName || user.displayName || "").split(" ")[0]
      }
      error={state.error}
      refreshing={state.refreshing}
      busyId={busyId}
      onRefresh={() => void state.refresh()}
      onAction={(item, type) => void action(item, type)}
    />
  );
}
