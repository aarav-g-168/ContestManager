import { parseAsUTC } from "./date";

const calendarDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getContestDay(start: string | Date) {
  const date = typeof start === "string" ? parseAsUTC(start) : start;
  return Number.isFinite(date.getTime()) ? calendarDay.format(date) : "";
}

export function getCalendarWeek(today: string) {
  const start = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      label:
        index === 0
          ? "Today"
          : date.toLocaleDateString("en-GB", {
              weekday: "short",
              timeZone: "UTC",
            }),
      fullLabel: date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
    };
  });
}
