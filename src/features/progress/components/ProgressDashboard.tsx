"use client";
import ProgressSkeleton from "@/features/progress/components/ProgressSkeleton";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ListChecks,
  LockKeyhole,
  PencilLine,
  RefreshCw,
  Target,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import AuthButton from "@/features/auth/components/AuthButton";
import { PlatformBadge } from "@/features/contests/components/ContestCard";
import { useProgress } from "@/features/progress/hooks/useProgress";
import { getPlatform } from "@/features/contests/lib/platforms";
import {
  progressJournalLink,
  type ProgressMonth,
  type ProgressSnapshot,
} from "@/features/progress/lib/progress";
import { JOURNAL_STATUSES } from "@/features/journal/lib/journal";
import "@/features/progress/styles.css";

const number = (value: number) => value.toLocaleString("en-GB");
const date = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const solved = (value: { solved: number; solvedRecorded: number }) =>
  value.solvedRecorded ? number(value.solved) : "—";

function ProgressWelcome() {
  return (
    <div className="site-container progress-page">
      <section className="progress-welcome">
        <div>
          <p className="progress-eyebrow">
            <Activity size={16} aria-hidden="true" />
            YOUR PROGRESS
          </p>
          <h1>
            See what your
            <br />
            rounds add up to.
          </h1>
          <p>
            A view of your participation, recorded solves, and the problems
            you’ve revisited. Built from the journal you keep.
          </p>
          <AuthButton expanded />
          <span className="progress-private">
            <LockKeyhole size={14} aria-hidden="true" />
            Private to your account
          </span>
          <Link href="/contests" className="text-link">
            Find your next round <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="progress-welcome-art" aria-hidden="true">
          <div>
            <BarChart3 size={21} />
            <span>ONE ROUND AT A TIME</span>
          </div>
          <div className="progress-art-bars">
            {[25, 48, 32, 66, 52, 85].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
          <p>Notice the work you’re putting in.</p>
          <small>Participation · Practice · Reflection</small>
        </div>
      </section>
    </div>
  );
}
type ViewProps = {
  data: ProgressSnapshot;
  months: number;
  platform: string;
  onMonthsChange: (months: number) => void;
  onPlatformChange: (platform: string) => void;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
};
export function ProgressView({
  data,
  months,
  platform,
  onMonthsChange,
  onPlatformChange,
  refreshing,
  error,
  onRefresh,
}: ViewProps) {
  const [mode, setMode] = useState<"rounds" | "solved">("rounds");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const current =
    data.monthly.find((m) => m.key === selectedMonth) ??
    data.monthly[data.monthly.length - 1];
  const total = data.totals;
  const max = Math.max(
    1,
    ...data.monthly.map((m) => (mode === "rounds" ? m.participated : m.solved)),
  );
  const completion = total.checklistTotal
    ? Math.round((total.checklistDone / total.checklistTotal) * 100)
    : null;
  const journalLink = progressJournalLink(data);
  const metricCards = [
    {
      label: "Rounds recorded",
      value: number(total.entries),
      detail: "All statuses in this period",
      icon: BookOpen,
    },
    {
      label: "Contests entered",
      value: number(total.participated),
      detail: "Marked as participated",
      icon: Target,
    },
    {
      label: "Problems solved",
      value: solved(total),
      detail: `Counts recorded for ${total.solvedRecorded} of ${total.participated} entered rounds`,
      icon: BarChart3,
    },
    {
      label: "Problems revisited",
      value: number(total.checklistDone),
      detail: `Of ${total.checklistTotal} checklist problems in this period`,
      icon: ListChecks,
    },
  ];
  return (
    <div className="site-container progress-page">
      <header className="progress-heading">
        <div>
          <p className="progress-eyebrow">
            <Activity size={15} aria-hidden="true" />
            YOUR WORKSPACE <span>/</span> PROGRESS
          </p>
          <h1>
            Progress<span>.</span>
          </h1>
          <p>A clear view of the rounds you’ve logged.</p>
        </div>
        <Link href="/journal" className="btn-secondary">
          Open journal <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <div className="progress-context">
        <span>
          <LockKeyhole size={14} aria-hidden="true" />
          Only you can see this
        </span>
        <span>
          <PencilLine size={14} aria-hidden="true" />
          Based on manually entered results
        </span>
      </div>
      <div className="progress-controls">
        <div
          className="progress-periods"
          role="group"
          aria-label="Progress period"
        >
          {[3, 6, 12].map((value) => (
            <button
              key={value}
              aria-pressed={months === value}
              onClick={() => onMonthsChange(value)}
            >
              {value} months
            </button>
          ))}
        </div>
        <label className="progress-platform-filter">
          <span>Platform</span>
          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
          >
            <option value="">All platforms</option>
            {data.availablePlatforms.map((host) => (
              <option key={host} value={host}>
                {getPlatform(host).name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="icon-button"
          aria-label="Refresh progress"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin" : undefined}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="progress-range">
        <span>
          {date(data.from)} — {date(data.to)} · IST calendar dates
        </span>
        <span role="status">
          {refreshing
            ? "Updating · showing previous snapshot"
            : `${number(total.entries)} ${total.entries === 1 ? "entry" : "entries"} in this view`}
        </span>
      </div>
      {error && (
        <div className="progress-error" role="alert">
          <p>{error} Showing your last loaded snapshot.</p>
          <button
            className="btn-secondary"
            disabled={refreshing}
            onClick={onRefresh}
          >
            Retry
          </button>
        </div>
      )}
      {!data.journalCount ? (
        <section className="progress-empty">
          <span>
            <BarChart3 size={30} aria-hidden="true" />
          </span>
          <p className="progress-eyebrow">START WITH A ROUND</p>
          <h2>Your journal is the starting point.</h2>
          <p>
            Add a contest entry with your result or a problem to revisit. Your
            progress will appear here as you log more rounds.
          </p>
          <Link href="/journal" className="btn-primary">
            Write your first entry <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <div>
            <span>
              <Target size={16} aria-hidden="true" />
              Monthly participation
            </span>
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              Recorded solves
            </span>
            <span>
              <Check size={16} aria-hidden="true" />
              Upsolving completion
            </span>
          </div>
        </section>
      ) : (
        <>
          {!total.entries && (
            <div className="progress-no-period">
              <p>
                No journal entries in this period
                {platform ? ` for ${getPlatform(platform).name}` : ""}. Your
                other entries are still in your journal.
              </p>
              <button
                className="text-link"
                onClick={() => {
                  onMonthsChange(12);
                  onPlatformChange("");
                }}
              >
                Show 12 months, all platforms{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}
          <section
            className="progress-metrics"
            aria-label="Progress totals for the selected period"
          >
            {metricCards.map(({ label, value, detail, icon: Icon }) => (
              <div className="progress-metric" key={label}>
                <span>
                  {label}
                  <Icon size={17} aria-hidden="true" />
                </span>
                <strong>{value}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </section>
          <div className="progress-feature-grid">
            <section
              className="progress-panel progress-activity"
              aria-labelledby="progress-activity-title"
            >
              <div className="progress-panel-heading">
                <div>
                  <p className="progress-eyebrow">MONTH BY MONTH</p>
                  <h2 id="progress-activity-title">
                    The rounds behind the numbers
                  </h2>
                </div>
                <div
                  className="progress-chart-mode"
                  role="group"
                  aria-label="Monthly chart metric"
                >
                  <button
                    aria-pressed={mode === "rounds"}
                    onClick={() => setMode("rounds")}
                  >
                    Rounds
                  </button>
                  <button
                    aria-pressed={mode === "solved"}
                    onClick={() => setMode("solved")}
                  >
                    Solved
                  </button>
                </div>
              </div>
              <p className="progress-panel-description">
                {mode === "rounds"
                  ? "Entries explicitly marked as participated, by contest month."
                  : "Recorded solves from participated rounds, by contest month. Missing counts stay unrecorded."}
              </p>
              <div className="progress-chart-scale">
                <span>
                  {mode === "rounds" ? "Entered rounds" : "Recorded solves"}
                </span>
                <span>Scale: 0–{number(max)}</span>
              </div>
              <div
                className="progress-bars"
                style={
                  {
                    "--month-count": data.monthly.length,
                    "--compact-month-count": Math.min(data.monthly.length, 6),
                    "--mobile-month-count": data.monthly.length === 12 ? 4 : 3,
                  } as CSSProperties
                }
                role="group"
                aria-label="Monthly progress chart. Select a month for details."
              >
                {data.monthly.map((month) => {
                  const value =
                    mode === "rounds" ? month.participated : month.solved;
                  const unknown =
                    mode === "solved" &&
                    month.participated > 0 &&
                    !month.solvedRecorded;
                  return (
                    <button
                      key={month.key}
                      className="progress-bar"
                      aria-pressed={current.key === month.key}
                      disabled={refreshing}
                      onClick={() => setSelectedMonth(month.key)}
                      aria-label={`${month.label}: ${mode === "rounds" ? `${month.participated} entered rounds` : unknown ? "solved count not recorded" : `${month.solved} recorded solves, counts entered for ${month.solvedRecorded} of ${month.participated} rounds`}`}
                    >
                      <span className="progress-bar-value" aria-hidden="true">
                        {unknown ? "—" : number(value)}
                      </span>
                      <span className="progress-bar-track" aria-hidden="true">
                        <i
                          data-unknown={unknown}
                          style={{ height: `${(value / max) * 100}%` }}
                        />
                      </span>
                      <span className="progress-bar-month" aria-hidden="true">
                        {month.label.split(" ")[0]}
                      </span>
                      <small aria-hidden="true">{month.key.slice(0, 4)}</small>
                    </button>
                  );
                })}
              </div>
              <MonthSummary month={current} data={data} />
              <p className="progress-chart-note">
                {data.activeMonths} of {data.months} months have a participated
                round logged. The current month is still in progress.
              </p>
              <details className="progress-data-details">
                <summary>
                  View monthly data <ChevronDown size={15} aria-hidden="true" />
                </summary>
                <div className="progress-table-scroll">
                  <table>
                    <caption className="sr-only">
                      Monthly journal totals for the selected period
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Month</th>
                        <th scope="col">Entered</th>
                        <th scope="col">Solved</th>
                        <th scope="col">Counts recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map((month) => (
                        <tr key={month.key}>
                          <th scope="row">{month.label}</th>
                          <td>{month.participated}</td>
                          <td>{solved(month)}</td>
                          <td>
                            {month.solvedRecorded}/{month.participated} rounds
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  — means no solved count was recorded. A logged zero stays
                  zero.
                </p>
              </details>
            </section>
            <section
              className="progress-panel progress-practice"
              aria-labelledby="progress-practice-title"
            >
              <div className="progress-panel-heading">
                <div>
                  <p className="progress-eyebrow">AFTER THE CONTEST</p>
                  <h2 id="progress-practice-title">
                    Coming back to the hard ones
                  </h2>
                </div>
              </div>
              <p className="progress-panel-description">
                Current checklist completion for rounds in this period.
              </p>
              <div className="progress-completion">
                <svg viewBox="0 0 140 140" aria-hidden="true">
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    className="progress-ring-track"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    className="progress-ring-value"
                    strokeDasharray={`${completion === null ? 0 : (total.checklistDone / total.checklistTotal) * 351.858} 351.858`}
                  />
                </svg>
                <div>
                  <strong>
                    {completion === null ? "—" : `${completion}%`}
                  </strong>
                  <span>revisited</span>
                </div>
              </div>
              <div className="progress-practice-counts">
                <div>
                  <span>
                    <i />
                    Revisited
                  </span>
                  <strong>{number(total.checklistDone)}</strong>
                </div>
                <div>
                  <span>
                    <i />
                    Still on the list
                  </span>
                  <strong>
                    {number(total.checklistTotal - total.checklistDone)}
                  </strong>
                </div>
              </div>
              <p className="progress-panel-description">
                {!total.checklistTotal
                  ? "Add a problem checklist to a journal entry to start tracking your practice."
                  : total.checklistTotal === total.checklistDone
                    ? "Every checklist problem in this view is marked as revisited."
                    : "Your unfinished problems are waiting in the journal. Pick one when you have time."}
              </p>
              <Link href={journalLink} className="text-link">
                Review your checklists{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <p className="progress-fine-print">
                This is today’s checklist state, grouped by contest date.
                Completion dates aren’t tracked yet.
              </p>
            </section>
          </div>
          <section
            className="progress-panel progress-platforms"
            aria-labelledby="progress-platform-title"
          >
            <div className="progress-panel-heading">
              <div>
                <p className="progress-eyebrow">BY PLATFORM</p>
                <h2 id="progress-platform-title">
                  Where you’ve been competing
                </h2>
              </div>
              <span className="progress-muted">Selected period</span>
            </div>
            {data.platforms.length ? (
              <div className="progress-table-scroll">
                <table>
                  <caption className="sr-only">
                    Platform breakdown of manually recorded journal results
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Platform</th>
                      <th scope="col">Entered rounds</th>
                      <th scope="col">Recorded solves</th>
                      <th scope="col">Best logged rank</th>
                      <th scope="col">Revisited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.platforms.map((row) => (
                      <tr key={row.host}>
                        <th scope="row">
                          <Link
                            href={progressJournalLink(data, {
                              platform: row.host,
                            })}
                          >
                            <PlatformBadge host={row.host} />
                            {getPlatform(row.host).name}
                            <ArrowUpRight size={13} aria-hidden="true" />
                          </Link>
                        </th>
                        <td>{number(row.participated)}</td>
                        <td>
                          {solved(row)}
                          <small>
                            {row.solvedRecorded}/{row.participated} counts
                            recorded
                          </small>
                        </td>
                        <td>
                          {row.bestRank === null
                            ? "—"
                            : `#${number(row.bestRank)}`}
                        </td>
                        <td>
                          {row.checklistDone}/{row.checklistTotal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="progress-panel-description">
                No platform activity logged in this view.
              </p>
            )}
            <p className="progress-fine-print">
              Rank is the smallest rank you entered for a participated round on
              that platform. Contest field sizes vary; ranks aren’t compared
              across platforms.
            </p>
          </section>
          <div className="progress-bottom-grid">
            <section
              className="progress-panel"
              aria-labelledby="progress-topic-title"
            >
              <div className="progress-panel-heading">
                <div>
                  <p className="progress-eyebrow">YOUR JOURNAL TOPICS</p>
                  <h2 id="progress-topic-title">What’s been on your mind</h2>
                </div>
              </div>
              <p className="progress-panel-description">
                Tags across journal entries in this view. These are topics you
                logged, not skill ratings.
              </p>
              {data.topics.length ? (
                <>
                  <ul className="progress-topics">
                    {data.topics.slice(0, 6).map((topic) => (
                      <li key={topic.topic}>
                        <Link
                          href={progressJournalLink(data, {
                            topic: topic.topic,
                          })}
                        >
                          <span>
                            {topic.topic}
                            <strong>
                              {topic.entries}{" "}
                              {topic.entries === 1 ? "entry" : "entries"}
                            </strong>
                          </span>
                          <i
                            aria-hidden="true"
                            style={
                              {
                                "--topic-width": `${(topic.entries / data.topics[0].entries) * 100}%`,
                              } as CSSProperties
                            }
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {data.topics.length > 6 && (
                    <details className="progress-more-topics">
                      <summary>
                        All {data.topics.length} topics{" "}
                        <ChevronDown size={14} aria-hidden="true" />
                      </summary>
                      <div>
                        {data.topics.slice(6).map((topic) => (
                          <Link
                            key={topic.topic}
                            href={progressJournalLink(data, {
                              topic: topic.topic,
                            })}
                          >
                            {topic.topic} · {topic.entries}
                          </Link>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <p className="progress-small-empty">
                  Add a few topic tags to your journal entries to see them here.
                </p>
              )}
            </section>
            <section
              className="progress-panel"
              aria-labelledby="progress-recent-title"
            >
              <div className="progress-panel-heading">
                <div>
                  <p className="progress-eyebrow">RECENT ROUNDS IN THIS VIEW</p>
                  <h2 id="progress-recent-title">The entries behind it all</h2>
                </div>
              </div>
              {data.recent.length ? (
                <ul className="progress-recent">
                  {data.recent.map((row) => (
                    <li key={row.id}>
                      <PlatformBadge host={row.host} />
                      <div>
                        <Link
                          href={progressJournalLink(data, {
                            q: row.title.slice(0, 120),
                            from: row.date,
                            to: row.date,
                          })}
                        >
                          {row.title}
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </Link>
                        <span>
                          {date(row.date)} ·{" "}
                          {JOURNAL_STATUSES[
                            row.status as keyof typeof JOURNAL_STATUSES
                          ] ?? "Recorded"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="progress-small-empty">
                  No journal entries in this period.
                </p>
              )}
              <Link href={journalLink} className="text-link">
                View journal entries <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </section>
          </div>
        </>
      )}
      <details className="progress-definitions">
        <summary>
          How these numbers are calculated{" "}
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <ul>
          <li>
            Period filters use contest dates in IST, covering the selected
            calendar months through today.
          </li>
          <li>
            Entered rounds and solved totals include only entries marked
            Participated. Skipped and To upsolve entries are counted separately
            in your journal.
          </li>
          <li>
            Missing solved counts are excluded and shown as —. Recorded zeroes
            are included. Coverage counts show how many entered rounds have a
            solved count.
          </li>
          <li>
            Checklist completion includes all entry statuses in the selected
            period. It reflects current checkboxes, not the month you completed
            each problem.
          </li>
          <li>
            All results come from your manual journal entries. They are not
            verified platform ratings or imported contest results.
          </li>
        </ul>
      </details>
      <footer className="progress-footer">
        <span>
          Updated{" "}
          {new Date(data.asOf).toLocaleTimeString("en-GB", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          IST
        </span>
        <Link href="/journal">
          Keep a note from your next round{" "}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
function MonthSummary({
  month,
  data,
}: {
  month: ProgressMonth;
  data: ProgressSnapshot;
}) {
  return (
    <div className="progress-month-summary" role="status" aria-live="polite">
      <div>
        <strong>{month.label}</strong>
        <span>
          {month.participated} entered · {solved(month)} recorded solves
        </span>
        <small>
          {month.solvedRecorded} of {month.participated} entered rounds have a
          solved count.
        </small>
      </div>
      <Link
        href={progressJournalLink(data, { from: month.from, to: month.to })}
      >
        View entries <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
export default function ProgressDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [months, setMonths] = useState(6),
    [platform, setPlatform] = useState("");
  const state = useProgress(months, platform);
  if (authLoading) return <ProgressSkeleton />;
  if (!user) return <ProgressWelcome />;
  if (!state.data && !state.error) return <ProgressSkeleton />;
  if (!state.data)
    return (
      <div className="site-container progress-page">
        <div className="progress-empty" role="alert">
          <BarChart3 size={28} aria-hidden="true" />
          <h1>Your progress couldn’t load.</h1>
          <p>{state.error}</p>
          <button
            className="btn-secondary"
            onClick={() => void state.refresh()}
            disabled={state.refreshing}
          >
            Try again
          </button>
        </div>
      </div>
    );
  return (
    <ProgressView
      key={user.uid}
      data={state.data}
      months={months}
      platform={platform}
      onMonthsChange={setMonths}
      onPlatformChange={setPlatform}
      refreshing={state.refreshing}
      error={state.error}
      onRefresh={() => void state.refresh()}
    />
  );
}
