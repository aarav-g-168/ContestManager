"use client";
import { useState, type CSSProperties } from "react";
import { DropdownMenu } from "radix-ui";
import {
  ArrowUpRight,
  Bell,
  BellOff,
  Bookmark,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import type { Contest } from "@/types/contest";
import type { ReminderType } from "@/hooks/reminders";
import { parseAsUTC } from "@/lib/date";
import { getPlatform } from "@/lib/platforms";
import { getGoogleCalendarLink } from "@/lib/calendar";
import CountdownTimer from "./countdownTimer";
import { SpotlightCard } from "./ui/interaction";
interface Props {
  contest: Contest;
  isBookmarked: boolean;
  onBookmarkToggle: (contest: Contest) => Promise<void>;
  hasReminder: boolean;
  reminderType?: ReminderType;
  onReminderSet: (contest: Contest, type: ReminderType) => Promise<void>;
  onReminderRemove: (id: number) => Promise<void>;
}
export function PlatformBadge({ host }: { host: string }) {
  const platform = getPlatform(host);
  return (
    <span
      className="platform-badge shrink-0"
      style={{ "--platform-color": platform.color } as CSSProperties}
      aria-hidden="true"
    >
      {platform.mark}
    </span>
  );
}
export default function ContestCard({
  contest,
  isBookmarked,
  onBookmarkToggle,
  hasReminder,
  reminderType,
  onReminderSet,
  onReminderRemove,
}: Props) {
  const [busy, setBusy] = useState(false);
  const platform = getPlatform(contest.host);
  const start = parseAsUTC(contest.start);
  const validDate = Number.isFinite(start.getTime());
  const duration =
    contest.duration > 0
      ? `${Math.floor(contest.duration / 3600) ? Math.floor(contest.duration / 3600) + "h " : ""}${Math.floor((contest.duration % 3600) / 60) ? Math.floor((contest.duration % 3600) / 60) + "m" : ""}`.trim() ||
        "< 1m"
      : "Not specified";
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }
  return (
    <SpotlightCard className="contest-card group h-full">
      <div className="flex items-center gap-2.5">
        <PlatformBadge host={contest.host} />
        <span className="min-w-0 truncate text-xs font-medium">
          {platform.name}
        </span>
        <span className="contest-countdown ml-auto shrink-0 rounded-md bg-primary/8 px-2 py-1">
          <CountdownTimer startTime={contest.start} />
        </span>
      </div>
      <h3 className="contest-title">{contest.event}</h3>
      <div className="contest-details mt-auto space-y-2.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays size={13} aria-hidden="true" />
          <time dateTime={validDate ? start.toISOString() : undefined}>
            {validDate
              ? start.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                  hour12: true,
                })
              : "To be announced"}
            <span className="ml-1.5 text-[10px] opacity-75">IST</span>
          </time>
        </p>
        <p className="flex items-center gap-2">
          <Clock3 size={13} aria-hidden="true" />
          {duration}
          <span className="mx-1 opacity-40">/</span>
          <span>
            {hasReminder
              ? `${reminderType} reminder set`
              : "Ready when you are"}
          </span>
        </p>
      </div>
      <div className="contest-footer">
        <div className="-ml-2 flex">
          <button
            className={`icon-button ${isBookmarked ? "!text-primary" : ""}`}
            disabled={busy}
            aria-pressed={isBookmarked}
            aria-label={`${isBookmarked ? "Remove bookmark for" : "Bookmark"} ${contest.event}`}
            title={isBookmarked ? "Remove bookmark" : "Save contest"}
            onClick={() => run(() => onBookmarkToggle(contest))}
          >
            {busy ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Bookmark
                size={16}
                fill={isBookmarked ? "currentColor" : "none"}
                aria-hidden="true"
              />
            )}
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                disabled={busy}
                className={`icon-button ${hasReminder ? "!text-primary" : ""}`}
                aria-label={`Reminder options for ${contest.event}`}
                title="Set a reminder"
              >
                <Bell
                  size={16}
                  fill={hasReminder ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={8}
                className="z-50 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
              >
                <DropdownMenu.Label className="eyebrow px-3 py-2">
                  Remind me before
                </DropdownMenu.Label>
                {(["1h", "6h", "24h"] as const).map((type) => (
                  <DropdownMenu.Item
                    key={type}
                    className="menu-item justify-between"
                    disabled={
                      busy ||
                      !validDate ||
                      start.getTime() -
                        Number(type.replace("h", "")) * 3600000 <=
                        Date.now()
                    }
                    onSelect={() => run(() => onReminderSet(contest, type))}
                  >
                    {type.replace("h", "")} hour{type === "1h" ? "" : "s"}{" "}
                    before{" "}
                    {reminderType === type && (
                      <Check
                        size={14}
                        className="text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </DropdownMenu.Item>
                ))}
                {hasReminder && (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item
                      className="menu-item text-destructive"
                      onSelect={() => run(() => onReminderRemove(contest.id))}
                    >
                      <BellOff size={14} aria-hidden="true" />
                      Remove reminder
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {validDate && (
            <a
              className="icon-button contest-calendar"
              href={getGoogleCalendarLink(
                contest.event,
                contest.start,
                contest.duration,
                contest.href,
              )}
              target="_blank"
              rel="noreferrer"
              title="Add to Google Calendar"
              aria-label={`Add ${contest.event} to Google Calendar (opens in a new tab)`}
            >
              <CalendarPlus size={16} aria-hidden="true" />
            </a>
          )}
        </div>
        <a
          href={contest.href}
          target="_blank"
          rel="noreferrer"
          className="text-link !text-xs"
          aria-label={`Open ${contest.event} (opens in a new tab)`}
        >
          View contest{" "}
          <ArrowUpRight size={15} className="text-primary" aria-hidden="true" />
        </a>
      </div>
    </SpotlightCard>
  );
}
