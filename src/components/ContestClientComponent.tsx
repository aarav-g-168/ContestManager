"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import ContestCard from "./contestCard";
import { useReminders } from "@/hooks/reminders";
import { useBookmarks } from "@/hooks/bookmarks";
import { useAuth } from "./AuthProvider";
import { getPlatform, getPlatformKey } from "@/lib/platforms";
import { parseAsUTC } from "@/lib/date";
import AuthButton from "./AuthButton";
import SkeletonGrid from "./SkeletonGrid";
import FeedError from "./FeedError";
import type { Contest } from "@/types/contest";
interface Props {
  feedError?: string | null;
  initialContests: Contest[];
  showFilters?: boolean;
  bookmarksOnly?: boolean;
  remindersOnly?: boolean;
}
export default function ContestClientComponent({
  feedError,
  initialContests,
  showFilters = false,
  bookmarksOnly = false,
  remindersOnly = false,
}: Props) {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("soonest");
  const [view, setView] = useState("grid");
  const [limit, setLimit] = useState(12);
  const { user, loading: authLoading } = useAuth();
  const bookmarks = useBookmarks();
  const reminder = useReminders();
  const reduced = useReducedMotion();
  const personal = bookmarksOnly || remindersOnly;
  const allPlatforms = useMemo(
    () =>
      Array.from(
        new Set(initialContests.map((item) => getPlatformKey(item.host))),
      ).sort((a, b) => getPlatform(a).name.localeCompare(getPlatform(b).name)),
    [initialContests],
  );
  const contests = useMemo(() => {
    const now = Date.now();
    const results = initialContests.filter((contest) => {
      if (bookmarksOnly && !bookmarks.bookmarkedContests.includes(contest.id))
        return false;
      if (remindersOnly && !(contest.id in reminder.reminders)) return false;
      if (platforms.length && !platforms.includes(getPlatformKey(contest.host)))
        return false;
      if (
        query &&
        !`${contest.event} ${getPlatform(contest.host).name}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      if (range !== "all") {
        const start = parseAsUTC(contest.start).getTime();
        if (start < now || start > now + Number(range) * 86400000) return false;
      }
      return true;
    });
    return [...results].sort((a, b) =>
      sort === "platform"
        ? getPlatform(a.host).name.localeCompare(getPlatform(b.host).name)
        : sort === "duration-short"
          ? a.duration - b.duration
          : sort === "duration-long"
            ? b.duration - a.duration
            : (parseAsUTC(a.start).getTime() - parseAsUTC(b.start).getTime()) *
              (sort === "latest" ? -1 : 1),
    );
  }, [
    initialContests,
    bookmarksOnly,
    remindersOnly,
    bookmarks.bookmarkedContests,
    reminder.reminders,
    platforms,
    query,
    range,
    sort,
  ]);
  function togglePlatform(host: string) {
    setPlatforms((current) =>
      current.includes(host)
        ? current.filter((item) => item !== host)
        : [...current, host],
    );
    setLimit(12);
  }
  function clearFilters() {
    setPlatforms([]);
    setQuery("");
    setRange("all");
    setLimit(12);
  }
  const filtered = !!(query || platforms.length || range !== "all");
  if (
    personal &&
    (authLoading || (bookmarksOnly ? bookmarks.loading : reminder.loading))
  )
    return <SkeletonGrid />;
  if (personal && !user) {
    const Icon = bookmarksOnly ? Bookmark : Bell;
    return (
      <div className="empty-state reveal">
        <div className="empty-state-icon">
          <Icon size={24} aria-hidden="true" />
        </div>
        <h2 className="text-xl font-medium tracking-tight">
          {bookmarksOnly
            ? "Your next challenge deserves a spot."
            : "A little nudge. Right on time."}
        </h2>
        <p className="mx-auto mb-6 mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
          Sign in with Google to{" "}
          {bookmarksOnly
            ? "build a personal shortlist and keep it with you across devices."
            : "set email reminders and never lose track of a contest."}
        </p>
        <AuthButton expanded />
        <p className="mt-5 font-mono text-[10px] text-muted-foreground">
          One account. Your own contest calendar.
        </p>
      </div>
    );
  }
  if (personal && (bookmarksOnly ? bookmarks.error : reminder.error))
    return (
      <div role="alert" className="empty-state">
        <h2 className="text-xl font-medium">
          Couldn’t load your {bookmarksOnly ? "bookmarks" : "reminders"}.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
        <button
          className="btn-secondary mt-6"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  if (feedError) return <FeedError message={feedError} />;
  return (
    <div>
      {showFilters && <h2 className="sr-only">Browse upcoming contests</h2>}
      {showFilters && (
        <div className="mb-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <label className="input-shell flex-1">
              <Search
                size={16}
                className="text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">Search contests</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(12);
                }}
                placeholder="Find your next challenge..."
              />
              {query && (
                <button
                  aria-label="Clear search"
                  className="flex min-h-9 min-w-9 items-center justify-center text-muted-foreground"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="btn-secondary !font-normal">
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  Platforms{" "}
                  {platforms.length > 0 && (
                    <span className="rounded bg-primary/10 px-1.5 text-primary">
                      {platforms.length}
                    </span>
                  )}
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-1.5">
                <Command>
                  <CommandInput placeholder="Search platforms..." />
                  <CommandList>
                    <CommandEmpty>No matching platform.</CommandEmpty>
                    <CommandGroup>
                      {allPlatforms.map((host) => (
                        <CommandItem
                          key={host}
                          onSelect={() => togglePlatform(host)}
                          className="min-h-11 gap-3"
                          aria-label={`${getPlatform(host).name}${platforms.includes(host) ? ", filter applied" : ""}`}
                        >
                          <span
                            className={`flex size-4 items-center justify-center rounded border ${platforms.includes(host) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                          >
                            {platforms.includes(host) && (
                              <Check size={11} aria-hidden="true" />
                            )}
                          </span>
                          {getPlatform(host).name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {platforms.length > 0 && (
                  <button
                    className="menu-item text-primary"
                    onClick={() => setPlatforms([])}
                  >
                    Clear platform filters
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <label className="input-shell">
              <span className="sr-only">Sort contests</span>
              <select
                className="min-h-11 w-full bg-transparent text-xs outline-none"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="soonest">Soonest first</option>
                <option value="latest">Latest first</option>
                <option value="duration-short">Shortest duration</option>
                <option value="duration-long">Longest duration</option>
                <option value="platform">Platform A–Z</option>
              </select>
            </label>
          </div>
          <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div
              className="flex flex-wrap gap-1"
              aria-label="Contest date range"
            >
              {[
                { id: "all", label: "All upcoming" },
                { id: "1", label: "Next 24 hours" },
                { id: "7", label: "This week" },
                { id: "30", label: "This month" },
              ].map((item) => (
                <button
                  key={item.id}
                  className="filter-chip"
                  data-active={range === item.id}
                  aria-pressed={range === item.id}
                  onClick={() => {
                    setRange(item.id);
                    setLimit(12);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <p
                className="font-mono text-[10px] text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {contests.length} contest{contests.length !== 1 ? "s" : ""}
              </p>
              <div
                className="hidden items-center rounded-md border border-border p-0.5 md:flex"
                role="group"
                aria-label="Contest layout"
              >
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  className={`icon-button !size-9 !rounded ${view === "grid" ? "bg-muted !text-foreground" : ""}`}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  className={`icon-button !size-9 !rounded ${view === "list" ? "bg-muted !text-foreground" : ""}`}
                  onClick={() => setView("list")}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>
          {platforms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {platforms.map((host) => (
                <button
                  key={host}
                  className="filter-chip !border-border !bg-card !text-foreground"
                  onClick={() => togglePlatform(host)}
                  aria-label={`Remove ${getPlatform(host).name} filter`}
                >
                  {getPlatform(host).name}
                  <X size={12} aria-hidden="true" />
                </button>
              ))}
              <button
                className="px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={clearFilters}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
      {contests.length ? (
        <div
          key={view}
          className={`contest-grid ${view === "list" ? "list-view" : ""}`}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {contests.slice(0, limit).map((contest, index) => (
              <motion.div
                key={contest.id}
                layout={reduced ? false : "position"}
                initial={{ opacity: 0, y: reduced ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
                transition={{
                  duration: reduced ? 0 : 0.22,
                  delay: reduced ? 0 : Math.min(index, 5) * 0.035,
                }}
                className="min-w-0"
              >
                <ContestCard
                  contest={contest}
                  isBookmarked={bookmarks.bookmarkedContests.includes(
                    contest.id,
                  )}
                  onBookmarkToggle={bookmarks.toggleBookmark}
                  hasReminder={contest.id in reminder.reminders}
                  reminderType={reminder.reminders[contest.id]}
                  onReminderSet={reminder.addReminder}
                  onReminderRemove={reminder.removeReminder}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            {remindersOnly ? (
              <Bell size={24} />
            ) : bookmarksOnly ? (
              <Bookmark size={24} />
            ) : (
              <Search size={24} />
            )}
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            {filtered
              ? "No contests match just yet."
              : bookmarksOnly
                ? "Make room for your next challenge."
                : remindersOnly
                  ? "Your calendar is quiet. For now."
                  : "The next challenge is on its way."}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
            {filtered
              ? "Try another search or loosen your filters."
              : bookmarksOnly
                ? "Tap the bookmark on any contest to start building your shortlist."
                : remindersOnly
                  ? "Choose a contest and tap the bell. We'll take care of the nudge."
                  : "Check back soon for newly announced contests."}
          </p>
          {filtered ? (
            <button onClick={clearFilters} className="btn-secondary mt-6">
              Reset filters
            </button>
          ) : personal ? (
            <Link href="/contests" className="btn-primary mt-6">
              Find a contest <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      )}
      {contests.length > limit && (
        <div className="mt-8 text-center">
          <button
            className="btn-secondary"
            onClick={() => setLimit((current) => current + 12)}
          >
            Show more contests{" "}
            <span className="font-mono text-[10px] text-muted-foreground">
              {contests.length - limit} more
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
