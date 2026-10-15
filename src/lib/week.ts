import type { Contest } from "@/types/contest";
import { parseAsUTC } from "./date";
import { getContestDay, getCalendarWeek } from "./contestCalendar";

export type WeekItem = {
  contest: Contest;
  bookmarked: boolean;
  reminder: {
    type: "1h" | "6h" | "24h";
    status: string;
    dueAt: string;
    contestStart: string;
  } | null;
};
export type WeekPlan = { asOf: string; items: WeekItem[] };
export type WeekRound = WeekItem & {
  start: number;
  end: number;
  day: string;
  live: boolean;
  scheduleChanged: boolean;
};
export const WEEK_TIMEZONE = "Asia/Kolkata";
export function weekWindow(now: number) {
  const today = getContestDay(new Date(now));
  const start = Date.parse(`${today}T00:00:00+05:30`);
  return {
    today,
    start,
    end: start + 7 * 86400000,
    days: getCalendarWeek(today),
  };
}
export function weekRounds(
  items: WeekItem[],
  feed: Contest[],
  now: number,
): WeekRound[] {
  const window = weekWindow(now);
  const fresh = new Map(feed.map((contest) => [contest.id, contest]));
  return items
    .flatMap((item) => {
      const contest = fresh.get(item.contest.id) ?? item.contest;
      const start = parseAsUTC(contest.start).getTime();
      const end = start + Math.max(0, contest.duration || 0) * 1000;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= now ||
        start >= window.end
      )
        return [];
      const live = start <= now && end > now;
      return [
        {
          ...item,
          contest,
          start,
          end,
          live,
          day: live ? window.today : getContestDay(contest.start),
          scheduleChanged:
            !!item.reminder &&
            parseAsUTC(item.reminder.contestStart).getTime() !== start,
        },
      ];
    })
    .sort((a, b) => a.start - b.start || a.contest.id - b.contest.id);
}
export function weekOverlaps(rounds: WeekRound[], now: number) {
  const pairs: { first: WeekRound; second: WeekRound; minutes: number }[] = [];
  for (let a = 0; a < rounds.length; a++) {
    for (let b = a + 1; b < rounds.length; b++) {
      const first = rounds[a],
        second = rounds[b];
      if (first.end <= first.start || second.end <= second.start) continue;
      const start = Math.max(first.start, second.start, now);
      const end = Math.min(first.end, second.end);
      if (start < end)
        pairs.push({
          first,
          second,
          minutes: Math.ceil((end - start) / 60000),
        });
    }
  }
  return pairs;
}
export function weekDuration(seconds: number) {
  if (seconds <= 0) return "Duration TBA";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes >= 60 ? `${Math.floor(minutes / 60)}h` : ""}${minutes % 60 ? `${minutes >= 60 ? " " : ""}${minutes % 60}m` : ""}`;
}
export function reminderLabel(item: WeekItem) {
  if (!item.reminder) return "No email reminder";
  return (
    (
      {
        pending: "Scheduling email",
        scheduled: `${item.reminder.type} email scheduled`,
        sent: "Email sent",
        delivered: "Email delivered",
        failed: "Email failed",
        bounced: "Email bounced",
        uncertain: "Email status needs review",
        expired: "Reminder time passed",
        cancelled: "Email cancelled",
      } as Record<string, string>
    )[item.reminder.status] ?? "Email status unavailable"
  );
}
