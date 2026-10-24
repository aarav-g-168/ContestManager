"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/AuthProvider";
import AuthButton from "@/features/auth/components/AuthButton";
import { usePractice } from "@/features/journal/hooks/usePractice";
import {
  PRACTICE_PRIORITIES,
  type PracticeItem,
  type PracticeQuery,
  type PracticeSnapshot,
  type PracticeUpdate,
} from "@/features/journal/lib/practice";
import { getContestDay } from "@/features/contests/lib/calendar";
import { useClock } from "@/hooks/useClock";
import { getPlatform } from "@/features/contests/lib/platforms";
import { PlatformBadge } from "@/features/contests/components/ContestCard";
import JournalNavigation from "@/features/journal/components/JournalNavigation";
import PracticeSkeleton from "@/features/journal/components/PracticeSkeleton";
import "@/features/journal/styles.css";

const labelDate = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export const defaultPracticeQuery: PracticeQuery = {
  q: "",
  platform: "",
  topic: "",
  status: "pending",
  priority: "",
  planned: "",
  page: 1,
};
type Props = {
  snapshot: PracticeSnapshot;
  filters: PracticeQuery;
  onFilters: (query: PracticeQuery) => void;
  today: string;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  onSave: (item: PracticeItem, patch: PracticeUpdate) => Promise<void>;
};
export function PracticeView({
  snapshot,
  filters,
  onFilters,
  today,
  pending,
  error,
  onRefresh,
  onSave,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const reportDirty = useCallback(
    (key: string, value: boolean) =>
      setDirty((old) => (old[key] === value ? old : { ...old, [key]: value })),
    [],
  );
  const hasDraft = Object.values(dirty).some(Boolean);
  const blocked = busy || hasDraft;
  function filter(key: keyof PracticeQuery, value: string) {
    onFilters({ ...filters, [key]: value, page: 1 });
  }
  const active = !!(
    filters.q ||
    filters.platform ||
    filters.topic ||
    filters.priority ||
    filters.planned ||
    filters.status !== "pending"
  );
  return (
    <>
      <header className="journal-heading">
        <div>
          <p className="journal-eyebrow">
            <ListChecks size={15} aria-hidden="true" />
            YOUR WORKSPACE <span>/</span> PRACTICE
          </p>
          <h1>
            One problem at a time<span>.</span>
          </h1>
          <p>The unfinished problems from every round, in one place.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={onRefresh}
          disabled={pending || blocked}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={pending ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </header>
      <JournalNavigation active="practice" />
      {error && (
        <div role="alert" className="journal-load-error">
          <p>{error} Showing your last loaded queue.</p>
          <button
            className="btn-secondary"
            onClick={onRefresh}
            disabled={pending || blocked}
          >
            Retry
          </button>
        </div>
      )}
      <section
        className="practice-overview"
        aria-label="All-time practice totals"
      >
        <div>
          <span>To practise</span>
          <strong>{snapshot.stats.pending}</strong>
          <small>Unfinished across your journal</small>
        </div>
        <div>
          <span>Planned</span>
          <strong>{snapshot.stats.planned}</strong>
          <small>Today or a future date</small>
        </div>
        <div>
          <span>Overdue</span>
          <strong>{snapshot.stats.overdue}</strong>
          <small>Ready to reschedule</small>
        </div>
        <div>
          <span>Revisited</span>
          <strong>{snapshot.stats.completed}</strong>
          <small>Checked off by you</small>
        </div>
      </section>
      <div className="practice-layout">
        <section aria-labelledby="practice-list-title">
          <div className="journal-library-heading">
            <h2 id="practice-list-title">Your practice queue</h2>
            <span role="status">
              {pending
                ? "Updating…"
                : `${snapshot.total} ${snapshot.total === 1 ? "problem" : "problems"}`}
            </span>
          </div>
          <fieldset className="practice-filter-fieldset" disabled={blocked}>
            <legend className="sr-only">Filter your practice queue</legend>
            <div className="practice-filters">
              <label className="practice-search">
                <span>Search</span>
                <div>
                  <Search size={16} aria-hidden="true" />
                  <input
                    value={filters.q}
                    maxLength={120}
                    onChange={(e) => filter("q", e.target.value)}
                    placeholder="Problem or contest name"
                  />
                </div>
              </label>
              <label>
                <span>Show</span>
                <select
                  value={filters.status}
                  onChange={(e) => filter("status", e.target.value)}
                >
                  <option value="pending">To practise</option>
                  <option value="completed">Revisited</option>
                  <option value="all">All problems</option>
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select
                  value={filters.priority}
                  onChange={(e) => filter("priority", e.target.value)}
                >
                  <option value="">Any priority</option>
                  {Object.entries(PRACTICE_PRIORITIES).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Platform</span>
                <select
                  value={filters.platform}
                  onChange={(e) => filter("platform", e.target.value)}
                >
                  <option value="">All platforms</option>
                  {snapshot.platforms.map((host) => (
                    <option key={host} value={host}>
                      {getPlatform(host).name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Topic · from entry</span>
                <select
                  value={filters.topic}
                  onChange={(e) => filter("topic", e.target.value)}
                >
                  <option value="">All topics</option>
                  {snapshot.topics.map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
              </label>
            </div>
            {filters.planned && (
              <p className="practice-hint">
                Planned for {labelDate(filters.planned)}{" "}
                <button
                  className="text-link"
                  onClick={() => filter("planned", "")}
                >
                  Show all dates
                </button>
              </p>
            )}
            {active && (
              <button
                className="text-link practice-reset"
                onClick={() => onFilters({ ...defaultPracticeQuery })}
              >
                Reset filters
              </button>
            )}
          </fieldset>
          {hasDraft && (
            <p className="practice-hint" role="status">
              Save or discard your open changes before refreshing or filtering.
            </p>
          )}
          {pending && !snapshot.items.length ? (
            <PracticeSkeleton />
          ) : snapshot.items.length ? (
            <div className="practice-list" aria-busy={pending}>
              {snapshot.items.map((item) => (
                <PracticeCard
                  key={`${item.entryId}:${item.problem.id}`}
                  item={item}
                  today={today}
                  disabled={busy || pending}
                  onDirty={reportDirty}
                  onSave={async (patch) => {
                    setBusy(true);
                    try {
                      await onSave(item, patch);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="journal-empty">
              <ListChecks size={28} aria-hidden="true" />
              <h3>
                {active
                  ? "No problems match these filters."
                  : snapshot.stats.completed
                    ? "You’re through your list."
                    : "Keep a problem for next time."}
              </h3>
              <p>
                {active
                  ? "Try another topic, platform or status."
                  : "Add problems to a journal entry. They’ll appear here, ready to plan and practise."}
              </p>
              <Link className="btn-secondary" href="/journal">
                Open your entries <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
          {snapshot.total > snapshot.pageSize && (
            <div className="journal-pagination">
              <button
                className="btn-secondary"
                disabled={snapshot.page <= 1 || pending || blocked}
                onClick={() =>
                  onFilters({ ...filters, page: snapshot.page - 1 })
                }
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <span>
                Page {snapshot.page} of{" "}
                {Math.ceil(snapshot.total / snapshot.pageSize)}
              </span>
              <button
                className="btn-secondary"
                disabled={
                  snapshot.page * snapshot.pageSize >= snapshot.total ||
                  pending ||
                  blocked
                }
                onClick={() =>
                  onFilters({ ...filters, page: snapshot.page + 1 })
                }
              >
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
        <aside className="practice-aside">
          <p className="journal-eyebrow">A LITTLE DIRECTION</p>
          <h2>Make room for the retry.</h2>
          <p>
            Pick a date for one problem. Write down the idea that finally made
            it click.
          </p>
          <ol>
            <li>
              <strong>Choose your next problem</strong>
              <span>Planned dates come first, then priority.</span>
            </li>
            <li>
              <strong>Give it a day</strong>
              <span>
                Planned problems appear in My week. This doesn’t create an email
                reminder.
              </span>
            </li>
            <li>
              <strong>Keep the useful bit</strong>
              <span>
                A short takeaway is enough. Mark it revisited when you’re done.
              </span>
            </li>
          </ol>
          <Link className="text-link" href="/week">
            See My week <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <p className="practice-hint">
            Private to your account. Topics come from the contest entry. Your
            contest score stays separate.
          </p>
        </aside>
      </div>
    </>
  );
}
function details(item: PracticeItem): PracticeUpdate {
  return {
    done: item.problem.done,
    priority: item.problem.priority ?? "normal",
    plannedDate: item.problem.plannedDate ?? "",
    takeaway: item.problem.takeaway ?? "",
  };
}
function PracticeCard({
  item,
  today,
  disabled,
  onSave,
  onDirty,
}: {
  item: PracticeItem;
  today: string;
  disabled: boolean;
  onSave: (patch: PracticeUpdate) => Promise<void>;
  onDirty: (key: string, dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(() => details(item));
  const [saved, setSaved] = useState(() => details(item));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  // Keep an open draft intact when another problem in the same entry updates its revision.
  const dirtyKey = `${item.entryId}:${item.problem.id}`;
  useEffect(() => {
    onDirty(dirtyKey, dirty);
  }, [dirty, dirtyKey, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(patch: PracticeUpdate) {
    setSaving(true);
    setError(null);
    try {
      await onSave(patch);
      setDraft(patch);
      setSaved(patch);
      onDirty(dirtyKey, false);
      toast.success(
        patch.done ? "Problem marked as revisited." : "Practice plan saved.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your changes couldn’t be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  const p = item.problem;
  const overdue = !p.done && p.plannedDate && p.plannedDate < today;
  return (
    <article className="practice-card" data-done={p.done} aria-busy={saving}>
      <div className="practice-card-meta">
        <span className="journal-platform">
          <PlatformBadge host={item.host} />
          {getPlatform(item.host).name}
        </span>
        <span
          className="practice-priority"
          data-priority={p.priority ?? "normal"}
        >
          {PRACTICE_PRIORITIES[p.priority ?? "normal"]} priority
        </span>
      </div>
      <h3>
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer">
            {p.title}
            <ArrowUpRight size={17} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          p.title
        )}
      </h3>
      <p className="practice-contest">{item.contest}</p>
      {item.topics.length > 0 && (
        <div className="journal-tags">
          {item.topics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      )}
      <div className="practice-card-actions">
        <span className="practice-date" data-overdue={!!overdue}>
          <CalendarDays size={15} aria-hidden="true" />
          {p.done
            ? p.completedAt
              ? `Revisited ${labelDate(getContestDay(p.completedAt))}`
              : "Revisited · date not recorded"
            : p.plannedDate
              ? `${overdue ? "Overdue · " : "Planned · "}${labelDate(p.plannedDate)}`
              : "No date set"}
        </span>
        <button
          className={p.done ? "btn-secondary" : "btn-primary"}
          disabled={disabled || saving || dirty}
          onClick={() => void save({ ...details(item), done: !p.done })}
        >
          {p.done ? (
            <RotateCcw size={15} aria-hidden="true" />
          ) : (
            <Check size={15} aria-hidden="true" />
          )}
          {saving ? "Saving…" : p.done ? "Practise again" : "Mark revisited"}
        </button>
      </div>
      <details className="practice-editor">
        <summary>
          Plan & takeaway <ChevronDown size={15} aria-hidden="true" />
          {dirty && <span>Unsaved</span>}
        </summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(draft);
          }}
        >
          <fieldset disabled={disabled || saving}>
            <div className="practice-editor-grid">
              <label>
                <span>Priority</span>
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      priority: e.target.value as PracticeUpdate["priority"],
                    })
                  }
                >
                  {Object.entries(PRACTICE_PRIORITIES).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Planned date · IST</span>
                <input
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={draft.plannedDate}
                  onChange={(e) =>
                    setDraft({ ...draft, plannedDate: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              <span>
                What clicked? <small>Optional · 1,000 characters</small>
              </span>
              <textarea
                rows={3}
                maxLength={1000}
                value={draft.takeaway}
                onChange={(e) =>
                  setDraft({ ...draft, takeaway: e.target.value })
                }
                placeholder="The idea you want to remember next time"
              />
            </label>
            <div className="practice-save">
              <button className="btn-primary" type="submit" disabled={!dirty}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                className="btn-secondary"
                type="button"
                disabled={!dirty}
                onClick={() => {
                  setDraft(details(item));
                  setSaved(details(item));
                  setError(null);
                }}
              >
                Discard changes
              </button>
            </div>
          </fieldset>
        </form>
      </details>
      {p.takeaway && (
        <blockquote className="practice-takeaway">{p.takeaway}</blockquote>
      )}
      {error && (
        <p className="journal-field-error" role="alert">
          {error} Your changes are still here.
        </p>
      )}
    </article>
  );
}
export default function PracticeQueue({
  initialQuery,
  initialNow,
}: {
  initialQuery: PracticeQuery;
  initialNow: number;
}) {
  const { user, loading } = useAuth();
  const now = useClock() ?? initialNow;
  const [filters, setFilters] = useState(initialQuery);
  const state = usePractice(
    new URLSearchParams(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    ).toString(),
  );
  if (!loading && !user)
    return (
      <div className="site-container journal-page">
        <JournalNavigation active="practice" />
        <div className="journal-empty">
          <ListChecks size={30} aria-hidden="true" />
          <h1>Your next good problem is waiting.</h1>
          <p>
            Sign in to plan and revisit problems from your private contest
            journal.
          </p>
          <AuthButton expanded />
        </div>
      </div>
    );
  return (
    <div className="site-container journal-page">
      {loading || state.loading ? (
        <>
          <JournalNavigation active="practice" />
          <PracticeSkeleton />
        </>
      ) : state.data ? (
        <PracticeView
          key={user?.uid}
          snapshot={state.data}
          filters={filters}
          onFilters={setFilters}
          today={getContestDay(new Date(now))}
          pending={state.pending}
          error={state.error}
          onRefresh={() => void state.refresh()}
          onSave={state.save}
        />
      ) : (
        <div className="journal-empty" role="alert">
          <h1>Your practice queue couldn’t load.</h1>
          <p>{state.error}</p>
          <button
            className="btn-secondary"
            onClick={() => void state.refresh()}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
