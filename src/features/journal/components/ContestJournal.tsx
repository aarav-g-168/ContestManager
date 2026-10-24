"use client";
import JournalSkeleton from "@/features/journal/components/JournalSkeleton";
import { JournalEntriesSkeleton } from "@/features/journal/components/JournalSkeleton";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  LockKeyhole,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/AuthProvider";
import AuthButton from "@/features/auth/components/AuthButton";
import { PlatformBadge } from "@/features/contests/components/ContestCard";
import { getPlatform } from "@/features/contests/lib/platforms";
import { getContestDay } from "@/features/contests/lib/calendar";
import { useClock } from "@/hooks/useClock";
import { useJournal } from "@/features/journal/hooks/useJournal";
import {
  JOURNAL_STATUSES,
  JOURNAL_TOPICS,
  type JournalEntry,
  type JournalSnapshot,
  type JournalValues,
} from "@/features/journal/lib/journal";
import JournalEditor from "@/features/journal/components/JournalEditor";
import JournalNavigation from "@/features/journal/components/JournalNavigation";
import { toast } from "sonner";
import "@/features/journal/styles.css";

export type JournalFilters = {
  q: string;
  platform: string;
  status: string;
  topic: string;
  from: string;
  to: string;
  page: number;
};
export const emptyJournalFilters: JournalFilters = {
  q: "",
  platform: "",
  status: "",
  topic: "",
  from: "",
  to: "",
  page: 1,
};
const dateLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function JournalWelcome() {
  return (
    <div className="site-container journal-page">
      <section className="journal-welcome">
        <div>
          <p className="journal-eyebrow">
            <BookOpen size={16} aria-hidden="true" />
            YOUR CONTEST JOURNAL
          </p>
          <h1>
            Keep more
            <br />
            than the rank.
          </h1>
          <p>
            Record a round, write down what you learned, and leave yourself a
            few good problems to come back to.
          </p>
          <AuthButton expanded />
          <span className="journal-private">
            <LockKeyhole size={14} aria-hidden="true" />
            Your entries are private to your account.
          </span>
          <Link className="text-link" href="/contests">
            Find your next contest <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="journal-paper" aria-hidden="true">
          <div>
            <BookOpen size={22} />
            <span>AFTER THE ROUND</span>
          </div>
          <h2>
            A few notes
            <br />
            for next time.
          </h2>
          <p>What went well</p>
          <i />
          <i className="journal-short-line" />
          <p>Something to revisit</p>
          <span className="journal-paper-check">
            <span />
            <i />
          </span>
          <span className="journal-paper-check">
            <span />
            <i />
          </span>
          <small>A result is a number. A lesson stays useful.</small>
        </div>
      </section>
    </div>
  );
}
type ViewProps = {
  snapshot: JournalSnapshot;
  filters: JournalFilters;
  onFiltersChange: (filters: JournalFilters) => void;
  today: string;
  pending: boolean;
  error: string | null;
  onRefresh: () => void;
  onSave: (
    values: JournalValues,
    entry: JournalEntry | null,
  ) => Promise<JournalEntry>;
};
export function JournalView({
  snapshot,
  filters,
  onFiltersChange,
  today,
  pending,
  error,
  onRefresh,
  onSave,
}: ViewProps) {
  const [editing, setEditing] = useState<{ entry: JournalEntry | null } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = !!(
    filters.q ||
    filters.platform ||
    filters.status ||
    filters.topic ||
    filters.from ||
    filters.to
  );
  const pages = Math.max(1, Math.ceil(snapshot.total / snapshot.pageSize));
  const filter = (field: keyof JournalFilters, value: string) =>
    onFiltersChange({ ...filters, [field]: value, page: 1 });
  async function save(values: JournalValues, entry: JournalEntry | null) {
    const result = await onSave(values, entry);
    toast.success(
      entry ? "Journal entry updated." : "Round added to your journal.",
    );
    return result;
  }
  async function toggle(entry: JournalEntry, problemId: string, done: boolean) {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      await onSave(
        {
          ...entry.values,
          problems: entry.values.problems.map((problem) =>
            problem.id === problemId ? { ...problem, done } : problem,
          ),
        },
        entry,
      );
      toast.success(
        done
          ? "Problem marked as revisited."
          : "Problem added back to your checklist.",
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Your checklist couldn’t be updated.",
      );
    } finally {
      setBusyId(null);
    }
  }
  return (
    <div className="site-container journal-page">
      <header className="journal-heading">
        <div>
          <p className="journal-eyebrow">
            <BookOpen size={15} aria-hidden="true" />
            YOUR WORKSPACE <span>/</span> CONTEST JOURNAL
          </p>
          <h1>
            Contest journal<span>.</span>
          </h1>
          <p>Your results, your notes, and the problems you’ll come back to.</p>
        </div>
        <div className="journal-heading-actions">
          <button
            className="icon-button"
            onClick={onRefresh}
            disabled={pending}
            aria-label="Refresh journal"
          >
            <RefreshCw
              size={17}
              className={pending ? "animate-spin" : undefined}
              aria-hidden="true"
            />
          </button>
          <button
            className="btn-primary"
            onClick={() => setEditing({ entry: null })}
          >
            <Plus size={17} aria-hidden="true" />
            New entry
          </button>
        </div>
      </header>
      <JournalNavigation active="entries" />
      <div className="journal-context">
        <span>
          <LockKeyhole size={14} aria-hidden="true" />
          Only you can see this
        </span>
        <span>
          <PencilLine size={14} aria-hidden="true" />
          Results entered manually
        </span>
        <Link href="/week">
          My week <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {error && (
        <div className="journal-load-error" role="alert">
          <p>{error} Showing the last loaded results.</p>
          <button
            className="btn-secondary"
            onClick={onRefresh}
            disabled={pending}
          >
            Retry
          </button>
        </div>
      )}
      <section className="journal-stats" aria-label="All-time journal totals">
        <div>
          <span>Rounds recorded</span>
          <strong>{snapshot.stats.total.toString().padStart(2, "0")}</strong>
          <small>All your journal entries</small>
        </div>
        <div>
          <span>Participated</span>
          <strong>
            {snapshot.stats.participated.toString().padStart(2, "0")}
          </strong>
          <small>Entries marked as participated</small>
        </div>
        <div>
          <span>Problems to revisit</span>
          <strong>
            {snapshot.stats.pendingProblems.toString().padStart(2, "0")}
          </strong>
          <small>Unchecked across your journal</small>
          <ListChecks size={24} aria-hidden="true" />
        </div>
      </section>
      <section
        className="journal-library"
        aria-labelledby="journal-library-title"
      >
        <div className="journal-library-heading">
          <h2 id="journal-library-title">Your entries</h2>
          <span role="status" aria-live="polite">
            {pending
              ? "Loading entries…"
              : `${snapshot.total} ${snapshot.total === 1 ? "entry" : "entries"}${active ? (snapshot.total === 1 ? " matches your filters" : " match your filters") : ""}`}
          </span>
        </div>
        <div className="journal-filters">
          <div className="journal-search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="journal-search">
              Search journal entries
            </label>
            <input
              id="journal-search"
              value={filters.q}
              maxLength={120}
              onChange={(e) => filter("q", e.target.value)}
              placeholder="Search contests, notes, or problems"
            />
            {filters.q && (
              <button
                className="icon-button"
                aria-label="Clear journal search"
                onClick={() => filter("q", "")}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
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
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(JOURNAL_STATUSES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details
          className="journal-filter-details"
          open={filters.topic || filters.from || filters.to ? true : undefined}
        >
          <summary>
            Topics and dates <ChevronDown size={15} aria-hidden="true" />
            {(filters.topic || filters.from || filters.to) && (
              <span>Filters applied</span>
            )}
          </summary>
          <div>
            <label>
              <span>Topic</span>
              <select
                value={filters.topic}
                onChange={(e) => filter("topic", e.target.value)}
              >
                <option value="">All topics</option>
                {[...new Set([...snapshot.topics, ...JOURNAL_TOPICS])]
                  .sort()
                  .map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>From · IST</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => filter("from", e.target.value)}
                max={filters.to || today}
                min="2000-01-01"
              />
            </label>
            <label>
              <span>Through · IST</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => filter("to", e.target.value)}
                min={filters.from || "2000-01-01"}
                max={today}
              />
            </label>
          </div>
        </details>
        {active && (
          <div className="journal-active-filters">
            <span>Filtered view</span>
            <button onClick={() => onFiltersChange({ ...emptyJournalFilters })}>
              Clear all filters <X size={13} aria-hidden="true" />
            </button>
          </div>
        )}
        {pending ? (
          <JournalEntriesSkeleton />
        ) : snapshot.entries.length ? (
          <div className="journal-grid">
            {snapshot.entries.map((entry) => (
              <JournalCard
                key={entry.id}
                entry={entry}
                disabled={busyId !== null}
                busy={busyId === entry.id}
                onEdit={() => setEditing({ entry })}
                onToggle={(id, done) => void toggle(entry, id, done)}
              />
            ))}
          </div>
        ) : (
          <div className="journal-empty">
            <span>
              <BookOpen size={28} aria-hidden="true" />
            </span>
            <h3>
              {active
                ? "No entries match these filters."
                : "Give your last round a page."}
            </h3>
            <p>
              {active
                ? "Try a different platform, date, topic, or search."
                : "Add your result, a lesson you learned, and a problem you want to try again. Your first entry can be short."}
            </p>
            {active ? (
              <button
                className="btn-secondary"
                onClick={() => onFiltersChange({ ...emptyJournalFilters })}
              >
                Reset filters
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setEditing({ entry: null })}
              >
                <Plus size={16} aria-hidden="true" />
                Write your first entry
              </button>
            )}
          </div>
        )}
        {pages > 1 && (
          <div className="journal-pagination">
            <button
              className="btn-secondary"
              disabled={filters.page <= 1 || pending}
              onClick={() =>
                onFiltersChange({ ...filters, page: filters.page - 1 })
              }
            >
              <ChevronLeft size={15} aria-hidden="true" />
              Previous
            </button>
            <span>
              Page {filters.page} of {pages}
            </span>
            <button
              className="btn-secondary"
              disabled={filters.page >= pages || pending}
              onClick={() =>
                onFiltersChange({ ...filters, page: filters.page + 1 })
              }
            >
              Next <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
      <footer className="journal-footer">
        <span>Private notes. Honest results. Something to build on.</span>
        <Link href="/contests">
          Find your next round <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
      {editing && (
        <JournalEditor
          key={editing.entry?.id ?? "new"}
          entry={editing.entry}
          candidates={snapshot.candidates}
          today={today}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
function JournalCard({
  entry,
  disabled,
  busy,
  onEdit,
  onToggle,
}: {
  entry: JournalEntry;
  disabled: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: (id: string, done: boolean) => void;
}) {
  const value = entry.values,
    done = value.problems.filter((p) => p.done).length;
  const preview = value.lessons || value.wentWell || value.mistakes;
  return (
    <article className="journal-card" aria-busy={busy}>
      <div className="journal-card-top">
        <span className="journal-platform">
          <PlatformBadge host={value.host} />
          {getPlatform(value.host).name}
        </span>
        <span className="journal-status" data-status={value.status}>
          {JOURNAL_STATUSES[value.status]}
        </span>
      </div>
      <time dateTime={value.date}>{dateLabel(value.date)}</time>
      <h3>
        <button onClick={onEdit} disabled={disabled}>
          {value.title}
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </h3>
      <div className="journal-result-strip">
        <div>
          <span>Rank</span>
          <strong>
            {value.rank === null
              ? "—"
              : `#${value.rank.toLocaleString("en-GB")}`}
          </strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{value.score || "—"}</strong>
        </div>
        <div>
          <span>Solved</span>
          <strong>{value.solved ?? "—"}</strong>
        </div>
      </div>
      {preview ? (
        <p className="journal-note-preview">{preview}</p>
      ) : (
        <p className="journal-note-placeholder">
          A result saved. Add a few notes when you’re ready.
        </p>
      )}
      {value.tags.length > 0 && (
        <div className="journal-tags">
          {value.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
      {value.problems.length > 0 && (
        <div className="journal-problem-progress">
          <ListChecks size={15} aria-hidden="true" />
          <span>
            {done} of {value.problems.length} problems revisited
          </span>
          <progress
            value={done}
            max={value.problems.length}
            aria-label={`${done} of ${value.problems.length} problems revisited`}
          />
        </div>
      )}
      <details className="journal-card-details">
        <summary>
          Notes, problems & links <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div>
          {(
            [
              { key: "wentWell", label: "What went well" },
              { key: "mistakes", label: "Mistakes & sticking points" },
              { key: "lessons", label: "Lessons for next time" },
            ] as const
          )
            .filter(({ key }) => value[key])
            .map(({ key, label }) => (
              <section key={key}>
                <h4>{label}</h4>
                <p>{value[key]}</p>
              </section>
            ))}
          {!preview && (
            <p className="journal-hint">
              No review notes yet. Open the entry to add them.
            </p>
          )}
          {value.problems.length > 0 && (
            <section>
              <h4>Problems to revisit</h4>
              <ul className="journal-checklist">
                {value.problems.map((p) => (
                  <li key={p.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={p.done}
                        disabled={disabled}
                        onChange={(e) => onToggle(p.id, e.target.checked)}
                      />
                      <span data-done={p.done}>{p.title}</span>
                    </label>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="icon-button"
                        aria-label={`Open ${p.title} (opens in a new tab)`}
                      >
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(value.href || value.links.length > 0) && (
            <section>
              <h4>Useful links</h4>
              <ul className="journal-reference-list">
                {[
                  ...(value.href
                    ? [
                        {
                          id: "contest",
                          label: "Contest page",
                          url: value.href,
                        },
                      ]
                    : []),
                  ...value.links,
                ].map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                      <ArrowUpRight size={14} aria-hidden="true" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </details>
      <div className="journal-card-bottom">
        <span>Entered manually</span>
        <button className="text-link" onClick={onEdit} disabled={disabled}>
          Review & edit <PencilLine size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
export default function ContestJournal({
  initialNow,
  initialFilters = emptyJournalFilters,
}: {
  initialNow: number;
  initialFilters?: JournalFilters;
}) {
  const { user, loading: authLoading } = useAuth();
  const [filters, setFilters] = useState<JournalFilters>({
    ...initialFilters,
  });
  const params = new URLSearchParams(
    Object.entries(filters).map(([key, value]) => [key, String(value)]),
  );
  const state = useJournal(params.toString());
  const now = useClock() ?? initialNow;
  if (authLoading) return <JournalSkeleton />;
  if (!user) return <JournalWelcome />;
  if (!state.data && state.loading) return <JournalSkeleton />;
  if (!state.data)
    return (
      <div className="site-container journal-page">
        <div className="journal-empty" role="alert">
          <BookOpen size={28} aria-hidden="true" />
          <h1>Your journal couldn’t load.</h1>
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
    <JournalView
      key={user.uid}
      snapshot={state.data}
      filters={filters}
      onFiltersChange={setFilters}
      today={getContestDay(new Date(now))}
      pending={state.refreshing}
      error={state.error}
      onRefresh={() => void state.refresh()}
      onSave={state.save}
    />
  );
}
